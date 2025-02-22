import {
  ControllerType,
  formDefinitionSchema,
  slugify
} from '@defra/forms-model'
import Boom from '@hapi/boom'
import { MongoServerError } from 'mongodb'
import { v4 as uuidV4 } from 'uuid'

import {
  makeFormLiveErrorMessages,
  removeFormErrorMessages
} from '~/src/api/forms/constants.js'
import { InvalidFormDefinitionError } from '~/src/api/forms/errors.js'
import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import {
  findComponent,
  findPage,
  summaryHelper,
  uniquePathGate
} from '~/src/api/forms/repositories/helpers.js'
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
 * @typedef {'draft' | 'live'} State
 */

const DRAFT = /** @type {State} */ ('draft')
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
 * Retrieves a paginated list of forms with filter options
 * @param {QueryOptions} options - Pagination, sorting, and filtering options
 * @returns {Promise<{ forms: FormMetadata[], totalItems: number, filters: FilterOptions }>}
 */
export async function listForms(options) {
  const { documents, totalItems, filters } = await formMetadata.list(options)
  const forms = documents.map(mapForm)

  return { forms, totalItems, filters }
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
 * @param {State} state - the form state
 * @param {ClientSession | undefined} [session]
 */
export function getFormDefinition(formId, state = DRAFT, session = undefined) {
  return formDefinition.get(formId, state, session)
}

/**
 * Partially update the [state] fields
 * @param {Date} date
 * @param {FormMetadataAuthor} author
 * @param {string} state
 * @returns {PartialFormMetadataDocument}
 */
const partialAuditFields = (date, author, state = DRAFT) => {
  return /** @type {PartialFormMetadataDocument} */ {
    [`${state}.updatedAt`]: date,
    [`${state}.updatedBy`]: author,
    updatedAt: date,
    updatedBy: author
  }
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
            $set: partialAuditFields(now, author)
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

    const { updatedAt, updatedBy, ...draftAuditFields } = partialAuditFields(
      now,
      author
    )

    /** @type {PartialFormMetadataDocument} */
    let updatedForm = {
      ...formUpdate,
      updatedAt,
      updatedBy
    }

    if (formUpdate.title) {
      updatedForm = {
        ...updatedForm,
        slug: slugify(formUpdate.title),
        ...draftAuditFields
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

    const draftFormDefinition = await formDefinition.get(formId, DRAFT)

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
      : partialAuditFields(now, author, 'live') // Partially update the live state fields

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
 */
export async function removeForm(formId) {
  logger.info(`Removing form with ID ${formId}`)

  const form = await getForm(formId)

  if (form.live) {
    throw Boom.badRequest(removeFormErrorMessages.formIsAlreadyLive)
  }

  const session = client.startSession()

  try {
    await session.withTransaction(async () => {
      await formMetadata.remove(formId, session)
      await formDefinition.remove(formId, session)
    })
  } finally {
    await session.endSession()
  }

  logger.info(`Removed form with ID ${formId}`)
}

const SUMMARY_PAGE_ID = '449a45f6-4541-4a46-91bd-8b8931b07b50'
/**
 * Adds id to summary page if it's missing
 * @param {PageSummary} summaryPage
 */
export const addIdToSummary = (summaryPage) => ({
  id: SUMMARY_PAGE_ID,
  ...summaryPage
})

/**
 * Repositions the summary page if it's not the last index of pages
 * @param {string} formId
 * @param {FormDefinition} definition
 * @param {FormMetadataAuthor} author
 */
export async function repositionSummaryPipeline(formId, definition, author) {
  const summaryResult = summaryHelper(definition)
  const { shouldRepositionSummary } = summaryResult

  logger.info(`Checking position of summary on ${formId}`)

  if (!shouldRepositionSummary) {
    logger.info(`Position of summary on ${formId} correct`)
    return summaryResult
  }

  logger.info(`Updating position of summary on Form ID ${formId}`)

  const session = client.startSession()

  const { summary } = summaryResult
  const summaryDefined = /** @type {PageSummary} */ (summary)
  const summaryWithId = addIdToSummary(summaryDefined)

  try {
    await session.withTransaction(async () => {
      await formDefinition.removeMatchingPages(
        formId,
        { controller: ControllerType.Summary },
        session
      )

      await formDefinition.addPageAtPosition(
        formId,
        /** @type {PageSummary} */ (summaryWithId),
        session,
        {}
      )

      // Update the form with the new draft state
      await formMetadata.update(
        formId,
        { $set: partialAuditFields(new Date(), author) },
        session
      )
    })
  } catch (err) {
    logger.error(
      err,
      `Failed to update position of summary on Form ID ${formId}`
    )
    throw err
  } finally {
    await session.endSession()
  }

  logger.info(`Updated position of summary on Form ID ${formId}`)

  return { ...summaryResult, summary: summaryWithId }
}

/**
 * Adds an id to a page
 * @param {Page} pageWithoutId
 * @returns {Page}
 */
const createPageWithId = (pageWithoutId) => ({
  ...pageWithoutId,
  id: uuidV4().toString()
})

/**
 * Adds a new page to a draft definition and calls repositionSummaryPipeline is summary exists
 * @param {string} formId
 * @param {Page} newPage
 * @param {FormMetadataAuthor} author
 */
export async function createPageOnDraftDefinition(formId, newPage, author) {
  logger.info(`Creating new page for form with ID ${formId}`)

  const session = client.startSession()

  /** @type {FormDefinition} */
  const formDraftDefinition = await getFormDefinition(formId, DRAFT)

  uniquePathGate(
    formDraftDefinition,
    newPage.path,
    `Duplicate page path on Form ID ${formId}`
  )

  const { summaryExists } = await repositionSummaryPipeline(
    formId,
    formDraftDefinition,
    author
  )
  /**
   * @type {{ position?: number; state?: 'live' | 'draft' }}
   */
  const options = {}

  if (summaryExists) {
    options.position = -1
  }

  const page = createPageWithId(newPage)

  try {
    await session.withTransaction(async () => {
      await formDefinition.addPageAtPosition(formId, page, session, options)

      // Update the form with the new draft state
      await formMetadata.update(
        formId,
        { $set: partialAuditFields(new Date(), author) },
        session
      )
    })
  } catch (err) {
    logger.error(err, `Failed to add page on ${formId}`)
    throw err
  } finally {
    await session.endSession()
  }

  logger.info(`Created new page for form with ID ${formId}`)

  return page
}

/**
 * Adds id to a component
 * @param {ComponentDef} component
 * @returns {ComponentDef}
 */
const addIdToComponent = (component) =>
  /** @type {ComponentDef} */ ({
    ...component,
    id: uuidV4()
  })

/**
 * Gets a page from a form definition and fails if the page is not found
 * @param {string} formId
 * @param {string} pageId
 * @param {ClientSession} [session]
 */
export async function getFormDefinitionPage(formId, pageId, session) {
  logger.info(`Getting Page ID ${pageId} on Form ID ${formId}`)

  const definition = /** @type {FormDefinition} */ await getFormDefinition(
    formId,
    DRAFT,
    session
  )

  const page = findPage(definition, pageId)

  if (page === undefined) {
    throw Boom.notFound(`Page ID ${pageId} not found on Form ID ${formId}`)
  }

  logger.info(`Got Page ID ${pageId} on Form ID ${formId}`)

  return page
}

/**
 * Gets a component from a formDefintion page if it exists, throws a Boom.notFound if not
 * @param {string} formId
 * @param {string} pageId
 * @param {string} componentId
 * @param {ClientSession} [session]
 */
export async function getFormDefinitionPageComponent(
  formId,
  pageId,
  componentId,
  session
) {
  logger.info(
    `Getting Component ID ${componentId} on Page ID ${pageId} & Form ID ${formId}`
  )

  const definition = /** @type {FormDefinition} */ await getFormDefinition(
    formId,
    DRAFT,
    session
  )

  const component = findComponent(definition, pageId, componentId)

  if (component === undefined) {
    throw Boom.notFound(
      `Component ID ${componentId} not found on Page ID ${pageId} & Form ID ${formId}`
    )
  }
  logger.info(
    `Got Component ID ${componentId} on Page ID ${pageId} & Form ID ${formId}`
  )

  return component
}
/**
 * Adds a component to the end of page components
 * @param {string} formId
 * @param {string} pageId
 * @param {ComponentDef[]} components
 * @param {FormMetadataAuthor} author
 * @param {boolean} prepend
 */
export async function createComponentOnDraftDefinition(
  formId,
  pageId,
  components,
  author,
  prepend = false
) {
  await getFormDefinitionPage(formId, pageId)

  logger.info(`Adding new component on Page ID ${pageId} on Form ID ${formId}`)

  const session = client.startSession()

  const createdComponents =
    /** @type {ComponentDef[]} */ components.map(addIdToComponent)

  const positionOptions = /** @satisfies {{ position?: number }} */ {}

  if (prepend) {
    positionOptions.position = 0
  }

  try {
    await session.withTransaction(async () => {
      await formDefinition.addComponents(
        formId,
        pageId,
        createdComponents,
        session,
        { state: DRAFT, ...positionOptions }
      )

      // Update the form with the new draft state
      await formMetadata.update(
        formId,
        { $set: partialAuditFields(new Date(), author) },
        session
      )
    })
  } catch (err) {
    logger.error(
      err,
      `Failed to add component on Page ID ${pageId} Form ID ${formId}`
    )
    throw err
  } finally {
    await session.endSession()
  }

  logger.info(`Added new component on Page ID ${pageId} on Form ID ${formId}`)

  return createdComponents
}

/**
 * Updates a component and throws a Boom.notFound if page or component is not found
 * @param {string} formId
 * @param {string} pageId
 * @param {string} componentId
 * @param {ComponentDef} component
 * @param {FormMetadataAuthor} author
 */
export async function updateComponentOnDraftDefinition(
  formId,
  pageId,
  componentId,
  component,
  author
) {
  logger.info(
    `Updating Component ID ${componentId} on Page ID ${pageId} & Form ID ${formId}`
  )

  let componentReturn = await getFormDefinitionPageComponent(
    formId,
    pageId,
    componentId
  )

  const session = client.startSession()

  try {
    await session.withTransaction(
      async () => {
        await formDefinition.updateComponent(
          formId,
          pageId,
          componentId,
          component,
          session,
          DRAFT
        )

        componentReturn = await getFormDefinitionPageComponent(
          formId,
          pageId,
          componentId,
          session
        )

        // Check that component has been updated
        if (JSON.stringify(componentReturn) !== JSON.stringify(component)) {
          throw Boom.internal(
            `Component ${componentId} not updated on Page ID ${pageId} and Form ID ${formId}`
          )
        }

        // Update the form with the new draft state
        await formMetadata.update(
          formId,
          { $set: partialAuditFields(new Date(), author) },
          session
        )
      },
      { readPreference: 'primary' }
    )
  } catch (err) {
    logger.error(
      err,
      `Failed to update Component ID ${componentId} on Page ID ${pageId} & Form ID ${formId}`
    )
    throw err
  } finally {
    await session.endSession()
  }

  logger.info(
    `Updated Component ID ${componentId} on Page ID ${pageId} & Form ID ${formId}`
  )

  return componentReturn
}
/**
 * Updates specific fields on a page, allowing concurrent changes should components be updated
 * @param {string} formId
 * @param {string} pageId
 * @param {PatchPageFields} pageFieldsToUpdate
 * @param {FormMetadataAuthor} author
 */
export async function patchFieldsOnDraftDefinitionPage(
  formId,
  pageId,
  pageFieldsToUpdate,
  author
) {
  let page = await getFormDefinitionPage(formId, pageId)

  const session = client.startSession()
  const fields = /** @type {(keyof PatchPageFields)[]} */ (
    Object.keys(pageFieldsToUpdate)
  )

  try {
    await session.withTransaction(
      async () => {
        await formDefinition.updatePageFields(
          formId,
          pageId,
          pageFieldsToUpdate,
          session,
          DRAFT
        )

        page = await getFormDefinitionPage(formId, pageId, session)

        // Check whether field changes have persisted and abort transaction if not
        const failedFields = /** @type {(keyof PatchPageFields)[]} */ ([])

        fields.forEach((field) => {
          if (page[field] !== pageFieldsToUpdate[field]) {
            failedFields.push(field)
          }
        })
        if (failedFields.length) {
          throw Boom.internal(
            `Failed to patch fields ${failedFields.toString()} on Page ID ${pageId} Form ID ${formId}`
          )
        }

        // Update the form with the new draft state
        await formMetadata.update(
          formId,
          { $set: partialAuditFields(new Date(), author) },
          session
        )
      },
      { readPreference: 'primary' }
    )
  } catch (err) {
    logger.error(
      err,
      `Failed to patch fields ${fields.toString()} on Page ID ${pageId} Form ID ${formId}`
    )
    throw err
  } finally {
    await session.endSession()
  }

  return page
}
/**
 * @import { FormDefinition, FormMetadataAuthor, FormMetadataDocument, FormMetadataInput, FormMetadata, FilterOptions, QueryOptions, Page, PageSummary, FormStatus, ComponentDef, PatchPageFields } from '@defra/forms-model'
 * @import { WithId, UpdateFilter, ClientSession } from 'mongodb'
 * @import { PartialFormMetadataDocument } from '~/src/api/types.js'
 */
