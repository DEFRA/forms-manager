import { formDefinitionSchema, slugify } from '@defra/forms-model'
import Boom from '@hapi/boom'

import {
  FormOperationFailedError,
  InvalidFormDefinitionError
} from '~/src/api/forms/errors.js'
import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import * as formTemplates from '~/src/api/forms/templates.js'
import { createLogger } from '~/src/helpers/logging/logger.js'
import { client } from '~/src/mongo.js'

const logger = createLogger()

/**
 * Maps a form metadata document from MongoDB to form metadata
 * @param {WithId<FormMetadataDocument>} document - form metadata document (with ID)
 * @returns {FormMetadata}
 */
function mapForm(document) {
  return {
    id: document._id.toString(),
    slug: document.slug,
    title: document.title,
    organisation: document.organisation,
    teamName: document.teamName,
    teamEmail: document.teamEmail,
    draft: document.draft,
    live: document.live
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
    }
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
 * Lists the available form metadata
 */
export async function listForms() {
  const documents = await formMetadata.list()

  return documents.map(mapForm)
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
 * Retrieves the form definition JSON content for a given form ID
 * @param {string} formId - the ID of the form
 * @param {'draft' | 'live'} state - the form state
 */
export function getFormDefinition(formId, state = 'draft') {
  return formDefinition.get(formId, state)
}

/**
 * @param {string} formId - ID of the form
 * @param {FormDefinition} definition - full JSON form definition
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
              'draft.updatedBy': author
            }
          },
          session
        )
      })
    } finally {
      await session.endSession()
    }

    logger.info(`Updated form metadata (draft) for form ID ${formId}`)
  } catch (cause) {
    const error = new FormOperationFailedError({ cause })

    logger.error(
      error,
      `Updating form definition (draft) for form ID ${formId} failed`
    )

    if (!Boom.isBoom(cause)) {
      throw Boom.internal(error)
    }

    throw error
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
      throw Boom.badRequest(`Form with ID '${formId}' has no draft state`)
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
          }
        }
      : {
          // Partially update the live state
          'live.updatedAt': now,
          'live.updatedBy': author
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
  } catch (cause) {
    const error = new FormOperationFailedError({ cause })

    logger.error(error, `Make draft live for form ID ${formId} failed`)

    if (!Boom.isBoom(cause)) {
      throw Boom.internal(error)
    }

    throw error
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
      }
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
  } catch (cause) {
    const error = new FormOperationFailedError({ cause })

    logger.error(error, `Create draft to edit for form ID ${formId} failed`)

    if (!Boom.isBoom(error)) {
      throw Boom.internal(error)
    }

    throw error
  }
}

/**
 * Deletes a form (metadata and definition)
 * @param {string} formId
 * @param {boolean} force - deletes the form even if it's live, and ignores failures to delete the form definition.
 */
export async function dropForm(formId, force = false) {
  logger.info(`Deleting form with ID ${formId} and force=${force}`)

  const form = await getForm(formId)

  if (!force && form.live) {
    throw Boom.badRequest(
      `Form with ID '${formId}' is live and cannot be deleted. Set force=true to delete the form anyway.`
    )
  }

  const session = client.startSession()

  try {
    await session.withTransaction(async () => {
      await formMetadata.drop(formId, session)

      try {
        await formDefinition.drop(formId, session)
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

  logger.info(`Deleted form with ID ${formId}`)
}

/**
 * @typedef {import('~/src/api/forms/errors.js').FormAlreadyExistsError} FormAlreadyExistsError
 * @typedef {import('@defra/forms-model').FormDefinition} FormDefinition
 * @typedef {import('@defra/forms-model').FormMetadata} FormMetadata
 * @typedef {import('@defra/forms-model').FormMetadataDocument} FormMetadataDocument
 * @typedef {import('@defra/forms-model').FormMetadataAuthor} FormMetadataAuthor
 * @typedef {import('@defra/forms-model').FormMetadataInput} FormMetadataInput
 */

/**
 * @template {object} Schema
 * @typedef {import('mongodb').WithId<Schema>} WithId
 */
