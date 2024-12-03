import { formDefinitionSchema, slugify } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { MongoServerError } from 'mongodb'

import { makeFormLiveErrorMessages } from '~/src/api/forms/constants.js'
import { InvalidFormDefinitionError } from '~/src/api/forms/errors.js'
import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import { MAX_RESULTS } from '~/src/api/forms/repositories/form-metadata-repository.js'
import * as formTemplates from '~/src/api/forms/templates.js'
import { createLogger } from '~/src/helpers/logging/logger.js'
import { client } from '~/src/mongo.js'

const logger = createLogger()

const defaultAuthor = {
  displayName: 'Unknown',
  id: '-1'
}

const defaultDate = new Date('2024-06-25T23:00:00Z') // date we went live

/**
 * Maps a form metadata document from MongoDB to form metadata
 * @param {WithId<Partial<FormMetadataDocument>>} document - form metadata document (with ID)
 * @returns {FormMetadata}
 */
function mapForm(document) {
  if (
    !document.slug ||
    !document.title ||
    !document.organisation ||
    !document.teamName ||
    !document.teamEmail
  ) {
    throw Error(
      'Form is malformed in the database. Expected fields are missing.'
    )
  }

  const lastUpdated = getLastUpdated(document)
  const created = getCreated(document)

  return {
    id: document._id.toString(),
    slug: document.slug,
    title: document.title,
    organisation: document.organisation,
    teamName: document.teamName,
    teamEmail: document.teamEmail,
    contact: document.contact,
    submissionGuidance: document.submissionGuidance,
    privacyNoticeUrl: document.privacyNoticeUrl,
    notificationEmail: document.notificationEmail,
    draft: document.draft,
    live: document.live,
    createdBy: created.createdBy,
    createdAt: created.createdAt,
    updatedBy: lastUpdated.updatedBy,
    updatedAt: lastUpdated.updatedAt
  }
}

/**
 * @param {Partial<FormMetadataDocument>} document - form metadata document
 * @returns {{ updatedAt: Date, updatedBy: FormMetadataAuthor }}
 */
function getLastUpdated(document) {
  if (document.updatedAt && document.updatedBy) {
    return { updatedAt: document.updatedAt, updatedBy: document.updatedBy }
  } else if (document.draft) {
    // draft is newer than live, handle it first
    return document.draft
  } else if (document.live) {
    return document.live
  } else {
    return { updatedAt: defaultDate, updatedBy: defaultAuthor }
  }
}

/**
 * @param {Partial<FormMetadataDocument>} document - form metadata document
 * @returns {{ createdAt: Date, createdBy: FormMetadataAuthor }}
 */
function getCreated(document) {
  if (document.createdAt && document.createdBy) {
    return { createdAt: document.createdAt, createdBy: document.createdBy }
  } else if (document.live) {
    // live is older than draft, handle it first
    return document.live
  } else if (document.draft) {
    return document.draft
  } else {
    return { createdAt: defaultDate, createdBy: defaultAuthor }
  }
}

/**
 * Creates a new empty form
 * @param {FormMetadataInput} metadataInput - the form metadata to save
 * @param {FormMetadataAuthor} author - the author details
 */
export async function createForm(metadataInput, author) {
  const { title } = metadataInput

  // Create a blank form definition with the title set
  const definition = { ...formTemplates.empty(), name: title }

  // Validate the form definition
  const { error } = formDefinitionSchema.validate(definition)
  if (error) {
    logger.warn(`Form failed validation: '${metadataInput.title}'`)
    throw new InvalidFormDefinitionError(metadataInput.title, {
      cause: error
    })
  }

  // Create the slug
  const slug = slugify(title)
  const now = new Date()

  /**
   * Create the metadata document
   * @satisfies {FormMetadataDocument}
   */
  const document = {
    ...metadataInput,
    slug,
    draft: {
      createdAt: now,
      createdBy: author,
      updatedAt: now,
      updatedBy: author
    },
    createdAt: now,
    createdBy: author,
    updatedAt: now,
    updatedBy: author
  }

  const session = client.startSession()

  /** @type {FormMetadata | undefined} */
  let metadata

  try {
    await session.withTransaction(async () => {
      // Create the metadata document
      const { insertedId: _id } = await formMetadata.create(document, session)
      metadata = mapForm({ ...document, _id })

      // Create the draft form definition
      await formDefinition.upsert(metadata.id, definition, session)
    })
  } finally {
    await session.endSession()
  }

  if (!metadata) {
    throw Boom.badRequest('No metadata created in the transaction')
  }

  return metadata
}

/**
 * Lists forms and returns query result metadata (e.g., pagination details, total counts)
 * @param {PaginationOptions} [options] - Optional pagination options
 * @returns {Promise<FormMetadata[] | QueryResult<FormMetadata>>}
 */
export async function listForms(options) {
  let documents

  if (!options?.page && !options?.perPage) {
    documents = await formMetadata.listAll()
    return documents.map(mapForm)
  }

  const page = options.page ?? 1
  const perPage = options.perPage ?? MAX_RESULTS

  const { documents: pagedDocuments, totalItems } = await formMetadata.list({
    page,
    perPage
  })
  documents = pagedDocuments
  const forms = documents.map(mapForm)

  return {
    data: forms,
    meta: {
      pagination: {
        page,
        perPage,
        totalItems,
        totalPages: Math.ceil(totalItems / perPage)
      }
    }
  }
}

/**
 * Retrieves form metadata by ID
 * @param {string} formId - ID of the form
 */
export async function getForm(formId) {
  const document = await formMetadata.get(formId)

  return mapForm(document)
}

/**
 * Retrieves form metadata by slug
 * @param {string} slug - The slug of the form
 */
export async function getFormBySlug(slug) {
  const document = await formMetadata.getBySlug(slug)

  return mapForm(document)
}

/**
 * Retrieves the form definition content for a given form ID
 * @param {string} formId - the ID of the form
 * @param {'draft' | 'live'} state - the form state
 */
export function getFormDefinition(formId, state = 'draft') {
  return formDefinition.get(formId, state)
}

/**
 * @param {string} formId - ID of the form
 * @param {FormDefinition} definition - full form definition
 * @param {FormMetadataAuthor} author - the author details
 */
export async function updateDraftFormDefinition(formId, definition, author) {
  logger.info(`Updating form definition (draft) for form ID ${formId}`)

  try {
    // Get the form metadata from the db
    const form = await getForm(formId)

    if (!form.draft) {
      throw Boom.badRequest(`Form with ID '${formId}' has no draft state`)
    }

    // some definition attributes shouldn't be customised by users, so patch
    // them on every write to prevent imported forms drifting (e.g. JSON upload)
    definition.name = form.title

    const session = client.startSession()

    try {
      await session.withTransaction(async () => {
        // Update the form definition
        await formDefinition.upsert(formId, definition, session)

        logger.info(`Updating form metadata (draft) for form ID ${formId}`)

        // Update the `updatedAt/By` fields of the draft state
        const now = new Date()
        await formMetadata.update(
          formId,
          {
            $set: {
              'draft.updatedAt': now,
              'draft.updatedBy': author,
              updatedAt: now,
              updatedBy: author
            }
          },
          session
        )
      })
    } finally {
      await session.endSession()
    }

    logger.info(`Updated form metadata (draft) for form ID ${formId}`)
  } catch (err) {
    logger.error(
      err,
      `Updating form definition (draft) for form ID ${formId} failed`
    )

    throw err
  }
}

/**
 * Updates the form metadata.
 * Note: If the 'title' is updated, this method also updates the form definition's 'name' to keep them in sync.
 * @param {string} formId - ID of the form
 * @param {Partial<FormMetadataInput>} formUpdate - full form definition
 * @param {FormMetadataAuthor} author - the author details
 */
export async function updateFormMetadata(formId, formUpdate, author) {
  logger.info(`Updating form metadata for form ID ${formId}`)

  try {
    // Get the form metadata from the db
    const form = await getForm(formId)

    if (form.live && 'title' in formUpdate) {
      throw Boom.badRequest(
        `Form with ID '${formId}' is live so 'title' cannot be updated`
      )
    }

    const now = new Date()

    /** @type {PartialFormMetadataDocument} */
    let updatedForm = {
      ...formUpdate,
      updatedAt: now,
      updatedBy: author
    }

    if (formUpdate.title) {
      updatedForm = {
        ...updatedForm,
        slug: slugify(formUpdate.title),
        'draft.updatedAt': now,
        'draft.updatedBy': author
      }
    }

    const session = client.startSession()

    await session.withTransaction(async () => {
      await formMetadata.update(formId, { $set: updatedForm }, session)

      if (formUpdate.title) {
        // Also update the form definition's name to keep them in sync
        await formDefinition.updateName(formId, formUpdate.title, session)
      }
    })

    logger.info(`Updated form metadata for form ID ${formId}`)

    return updatedForm.slug ?? form.slug
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) {
      logger.error(err, `Form title ${formUpdate.title} already exists`)
      throw Boom.badRequest(`Form title ${formUpdate.title} already exists`)
    }
    logger.error(err, `Updating form metadata for form ID ${formId} failed`)
    throw err
  }
}

/**
 * Creates the live form from the current draft state
 * @param {string} formId - ID of the form
 * @param {FormMetadataAuthor} author - the author of the new live state
 */
export async function createLiveFromDraft(formId, author) {
  logger.info(`Make draft live for form ID ${formId}`)

  try {
    // Get the form metadata from the db
    const form = await getForm(formId)

    if (!form.draft) {
      logger.error(
        `Form with ID '${formId}' has no draft state so failed deployment to live`
      )

      throw Boom.badRequest(makeFormLiveErrorMessages.missingDraft)
    }

    if (!form.contact) {
      throw Boom.badRequest(makeFormLiveErrorMessages.missingContact)
    }

    if (!form.submissionGuidance) {
      throw Boom.badRequest(makeFormLiveErrorMessages.missingSubmissionGuidance)
    }

    if (!form.privacyNoticeUrl) {
      throw Boom.badRequest(makeFormLiveErrorMessages.missingPrivacyNotice)
    }

    const draftFormDefinition = await formDefinition.get(formId, 'draft')

    if (!draftFormDefinition.startPage) {
      throw Boom.badRequest(makeFormLiveErrorMessages.missingStartPage)
    }

    if (!draftFormDefinition.outputEmail && !form.notificationEmail) {
      // TODO: remove the form def check once all forms have a notification email
      throw Boom.badRequest(makeFormLiveErrorMessages.missingOutputEmail)
    }

    // Build the live state
    const now = new Date()
    const set = !form.live
      ? {
          // Initialise the live state
          live: {
            updatedAt: now,
            updatedBy: author,
            createdAt: now,
            createdBy: author
          },
          updatedAt: now,
          updatedBy: author
        }
      : {
          // Partially update the live state
          'live.updatedAt': now,
          'live.updatedBy': author,
          updatedAt: now,
          updatedBy: author
        }

    const session = client.startSession()

    try {
      await session.withTransaction(async () => {
        // Copy the draft form definition
        await formDefinition.createLiveFromDraft(formId, session)

        logger.info(`Removing form metadata (draft) for form ID ${formId}`)

        // Update the form with the live state and clear the draft
        await formMetadata.update(
          formId,
          {
            $set: set,
            $unset: { draft: '' }
          },
          session
        )
      })
    } finally {
      await session.endSession()
    }

    logger.info(`Removed form metadata (draft) for form ID ${formId}`)
    logger.info(`Made draft live for form ID ${formId}`)
  } catch (err) {
    logger.error(err, `Make draft live for form ID ${formId} failed`)

    throw err
  }
}

/**
 * Recreates the draft form from the current live state
 * @param {string} formId - ID of the form
 * @param {FormMetadataAuthor} author - the author of the new draft
 */
export async function createDraftFromLive(formId, author) {
  logger.info(`Create draft to edit for form ID ${formId}`)

  try {
    // Get the form metadata from the db
    const form = await getForm(formId)

    if (!form.live) {
      throw Boom.badRequest(`Form with ID '${formId}' has no live state`)
    }

    // Build the draft state
    const now = new Date()
    const set = {
      draft: {
        updatedAt: now,
        updatedBy: author,
        createdAt: now,
        createdBy: author
      },
      updatedAt: now,
      updatedBy: author
    }

    const session = client.startSession()

    try {
      await session.withTransaction(async () => {
        // Copy the draft form definition
        await formDefinition.createDraftFromLive(formId, session)

        logger.info(`Adding form metadata (draft) for form ID ${formId}`)

        // Update the form with the new draft state
        await formMetadata.update(formId, { $set: set }, session)
      })
    } finally {
      await session.endSession()
    }

    logger.info(`Added form metadata (draft) for form ID ${formId}`)
    logger.info(`Created draft to edit for form ID ${formId}`)
  } catch (err) {
    logger.error(err, `Create draft to edit for form ID ${formId} failed`)

    throw err
  }
}

/**
 * Removes a form (metadata and definition)
 * @param {string} formId
 * @param {boolean} force - deletes the form even if it's live, and ignores failures to delete the form definition.
 */
export async function removeForm(formId, force = false) {
  logger.info(`Removing form with ID ${formId} and force=${force}`)

  const form = await getForm(formId)

  if (!force && form.live) {
    throw Boom.badRequest(
      `Form with ID '${formId}' is live and cannot be deleted. Set force=true to delete the form anyway.`
    )
  }

  const session = client.startSession()

  try {
    await session.withTransaction(async () => {
      await formMetadata.remove(formId, session)

      try {
        await formDefinition.remove(formId, session)
      } catch (err) {
        // we might have old forms that don't have form definitions but do have metadata entries.
        // TODO keep this as a short term only, then remove once cleaned up.
        if (!force) {
          throw err
        }
      }
    })
  } finally {
    await session.endSession()
  }

  logger.info(`Removed form with ID ${formId}`)
}

/**
 * @import { FormDefinition, FormMetadata, FormMetadataAuthor, FormMetadataDocument, FormMetadataInput, QueryResult, PaginationOptions } from '@defra/forms-model'
 * @import { WithId } from 'mongodb'
 * @import { PartialFormMetadataDocument} from '~/src/api/types.js'
 */
