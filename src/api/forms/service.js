import { formDefinitionSchema, slugify } from '@defra/forms-model'
import Boom from '@hapi/boom'

import * as draftFormDefinition from '~/src/api/forms/draft-form-definition-repository.js'
import { InvalidFormDefinitionError } from '~/src/api/forms/errors.js'
import * as formMetadata from '~/src/api/forms/form-metadata-repository.js'
import * as formTemplates from '~/src/api/forms/templates.js'
import { createLogger } from '~/src/helpers/logging/logger.js'

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
 * @param {FormMetadataInput} metadata - the form metadata to save
 * @param {FormMetadataAuthor} author - the author details
 * @throws {FormAlreadyExistsError} - if the form slug already exists
 * @throws {InvalidFormDefinitionError} - if the form definition is invalid
 */
export async function createForm(metadata, author) {
  const { title } = metadata

  // Create a blank form definition with the title set
  const definition = { ...formTemplates.empty(), name: title }

  // Validate the form definition
  const { error } = formDefinitionSchema.validate(definition)
  if (error) {
    logger.warn(`Form failed validation: ${metadata.title}`)
    throw new InvalidFormDefinitionError(error.message, {
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
    ...metadata,
    slug,
    draft: {
      createdAt: now,
      createdBy: author,
      updatedAt: now,
      updatedBy: author
    }
  }

  // Create the metadata document
  const { insertedId: _id } = await formMetadata.create(document)

  // Create the draft form definition
  await draftFormDefinition.create(_id.toString(), definition)

  logger.info(`Form ${_id.toString()} created: ${metadata.title}`)

  return mapForm({ ...document, _id })
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

  if (document) {
    return mapForm(document)
  }
}

/**
 * Retrieves form metadata by slug
 * @param {string} slug - The slug of the form
 */
export async function getFormBySlug(slug) {
  const document = await formMetadata.getBySlug(slug)

  if (document) {
    return mapForm(document)
  }
}

/**
 * Retrieves the form definition JSON content for a given form ID
 * @param {string} formId - the ID of the form
 * @param {'draft' | 'live'} state - the form state
 * @throws {FailedToReadFormError} - if the file does not exist or is empty
 */
export function getFormDefinition(formId, state = 'draft') {
  return draftFormDefinition.get(formId, state)
}

/**
 * @param {string} formId - ID of the form
 * @param {FormDefinition} definition - full JSON form definition
 * @param {FormMetadataAuthor} author - the author details
 */
export async function updateDraftFormDefinition(formId, definition, author) {
  const existingForm = await getForm(formId)

  if (!existingForm) {
    throw Boom.notFound(
      `Form ${formId} does not exist, so the definition cannot be updated.`
    )
  }

  // Throw if there's no current draft state
  if (!existingForm.draft) {
    throw Boom.badRequest(`No 'draft' state found for form metadata ${formId}`)
  }

  // Update the form definition
  await draftFormDefinition.create(formId, definition)
  logger.info('Form metadata updated')

  // Update the `updatedAt/By` fields of the draft state
  const now = new Date()
  const result = await formMetadata.update(formId, {
    $set: {
      'draft.updatedAt': now,
      'draft.updatedBy': author
    }
  })

  // Throw if updated record count is not 1
  if (result.modifiedCount !== 1) {
    throw Boom.badRequest(
      `Draft state not updated. Modified count ${result.modifiedCount}`
    )
  }

  logger.info('Form definition updated')
}

/**
 * Creates the live form from the current draft state
 * @param {string} formId - ID of the form
 * @param {FormMetadataAuthor} author - the author of the new live state
 */
export async function createLiveFromDraft(formId, author) {
  // Get the form metadata from the db
  const form = await getForm(formId)

  if (!form) {
    throw Boom.notFound(`Form with id '${formId}' not found`)
  }

  if (!form.draft) {
    throw Boom.badRequest(`Form with id '${formId}' has no draft state`)
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

  // Copy the draft form definition
  await draftFormDefinition.createLiveFromDraft(formId)
  logger.info(`Live form created for form ID ${formId}`)

  // Update the form with the live state and clear the draft
  const result = await formMetadata.update(formId, {
    $set: set,
    $unset: { draft: '' }
  })

  // Throw if updated record count is not 1
  if (result.modifiedCount !== 1) {
    throw Boom.badRequest(
      `Live state not created from draft. Modified count ${result.modifiedCount}`
    )
  }

  logger.info(`Live form created and draft form removed for form ID ${formId}`)
}

/**
 * Recreates the draft form from the current live state
 * @param {string} formId - ID of the form
 * @param {FormMetadataAuthor} author - the author of the new draft
 */
export async function createDraftFromLive(formId, author) {
  // Get the form metadata from the db
  const form = await getForm(formId)

  if (!form) {
    throw Boom.notFound(`Form with id '${formId}' not found`)
  }

  if (!form.live) {
    throw Boom.badRequest(`Form with id '${formId}' not in a live state`)
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

  // Copy the draft form definition
  await draftFormDefinition.createDraftFromLive(formId)
  logger.info(`Draft form definition created for form ID ${formId}`)

  // Update the form with the new draft state
  const result = await formMetadata.update(formId, { $set: set })

  // Throw if updated record count is not 1
  if (result.modifiedCount !== 1) {
    throw Boom.badRequest(
      `Draft state not created from draft. Modified count ${result.modifiedCount}`
    )
  }

  logger.info(`Draft form metadata updated for form ID ${formId}`)
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
