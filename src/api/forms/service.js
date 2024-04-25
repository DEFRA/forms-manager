import * as draftFormDefinition from '~/src/api/forms/draft-form-definition-repository.js'
import {
  InvalidFormDefinitionError,
  ResourceNotFoundError
} from '~/src/api/forms/errors.js'
import * as formMetadata from '~/src/api/forms/form-metadata-repository.js'
import * as formTemplates from '~/src/api/forms/templates.js'
import { formDefinitionSchema } from '~/src/models/forms.js'

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
    teamEmail: document.teamEmail
  }
}

/**
 * Adds an empty form
 * @param {FormMetadataInput} formMetadataInput - the desired form metadata to save
 * @throws {FormAlreadyExistsError} - if the form slug already exists
 * @throws {InvalidFormDefinitionError} - if the form definition is invalid
 */
export async function createForm(formMetadataInput) {
  const { title } = formMetadataInput

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

  /**
   * Create the metadata document
   * @satisfies {FormMetadataDocument}
   */
  const document = { ...formMetadataInput, slug }

  // Create the metadata document
  const { insertedId: _id } = await formMetadata.create(document)

  // Create the form definition
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
 * Retrieves form metadata
 * @param {string} formId - ID of the form
 */
export async function getForm(formId) {
  const document = await formMetadata.get(formId)

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
 *
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
 * @typedef {import('@defra/forms-model').FormDefinition} FormDefinition
 * @typedef {import('./errors.js').FormAlreadyExistsError} FormAlreadyExistsError
 * @typedef {import('../types.js').FormMetadata} FormMetadata
 * @typedef {import('../types.js').FormMetadataDocument} FormMetadataDocument
 * @typedef {import('../types.js').FormMetadataInput} FormMetadataInput
 */

/**
 * @template {object} Schema
 * @typedef {import('mongodb').WithId<Schema>} WithId
 */
