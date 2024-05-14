import { formDefinitionSchema } from '@defra/forms-model'
import Boom from '@hapi/boom'

import * as draftFormDefinition from '~/src/api/forms/draft-form-definition-repository.js'
import {
  InvalidFormDefinitionError,
  ResourceNotFoundError
} from '~/src/api/forms/errors.js'
import * as formMetadata from '~/src/api/forms/form-metadata-repository.js'
import * as formTemplates from '~/src/api/forms/templates.js'

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
 * @param {FormMetadataAuthor} author - the the author details
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
    throw new InvalidFormDefinitionError(error.message, {
      cause: error
    })
  }

  // Create the slug
  const slug = formTitleToSlug(title)
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
 * @throws {FailedToReadFormError} - if the file does not exist or is empty
 */
export function getDraftFormDefinition(formId) {
  return draftFormDefinition.get(formId)
}

/**
 * @param {string} formId - ID of the form
 * @param {FormDefinition} formDefinition - full JSON form definition
 */
export async function updateDraftFormDefinition(formId, formDefinition) {
  const existingForm = await getForm(formId)

  if (!existingForm) {
    throw new ResourceNotFoundError(
      `Form ${formId} does not exist, so the definition cannot be updated.`
    )
  }

  return draftFormDefinition.create(formId, formDefinition)
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
    throw Boom.notFound(`Form with id '${formId}' has no draft state`)
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

  // Update the form with the live state and clear the draft
  const result = await formMetadata.update(formId, {
    $set: set,
    $unset: { draft: '' }
  })

  // Throw if updated record count is not 1
  if (result.modifiedCount !== 1) {
    throw Boom.badRequest(
      `Live form not created from draft. result. Modified count ${result.modifiedCount}`
    )
  }
}

/**
 * Given a form title, returns the slug of the form.
 * E.g. "Hello - world" -> "hello-world".
 * @param {string} title - title of the form
 */
function formTitleToSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '') // remove any non-alphanumeric characters
    .replace(/\s+/g, ' ') // replace any whitespaces with a single space
    .replace(/ /g, '-') // replace any spaces with a hyphen
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
