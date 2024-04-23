import { Schema } from '@defra/forms-model'

import { emptyForm } from '~/src/api/forms/empty-form.js'
import { InvalidFormDefinitionError } from '~/src/api/forms/errors.js'
import * as formDefinition from '~/src/api/forms/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/form-metadata-repository.js'

/**
 * Maps a document to a FormConfiguration
 * @param {DocumentWithId} document - A mongo document
 * @returns {FormConfiguration}
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
 * @param {FormConfigurationInput} formConfigurationInput - the desired form configuration to save
 * @throws {FormAlreadyExistsError} - if the form slug already exists
 * @throws {InvalidFormDefinitionError} - if the form definition is invalid
 */
export async function createForm(formConfigurationInput) {
  const { title } = formConfigurationInput

  // Create the slug
  const slug = formTitleToSlug(title)
  const metadata = /** @type {FormConfigurationDocumentInput} */ ({
    ...formConfigurationInput,
    slug
  })

  // Create the metadata document
  const insertResult = await formMetadata.create(metadata)
  const formId = insertResult.insertedId.toString()

  // Create a blank form definition with the title set
  const definition = { ...emptyForm(), name: metadata.title }

  // Validate the form definition
  const { error } = Schema.validate(definition)
  if (error) {
    throw new InvalidFormDefinitionError(error.message, {
      cause: error
    })
  }

  // Create the form definition
  await formDefinition.create(formId, definition)

  // @ts-expect-error - Mongo mutates the document with an _id key
  return mapForm(/** @type {DocumentWithId} */ (metadata))
}

/**
 * Lists the available form configurations
 */
export async function listForms() {
  const documents = await formMetadata.list()

  return documents.map(mapForm)
}

/**
 * Retrieves a form configuration
 * @param {string} formId - ID of the form
 */
export async function getForm(formId) {
  const document = await formMetadata.get(formId)

  if (document) {
    return mapForm(document)
  }
}

/**
 * Retrieves the form definition for a given form ID
 * @param {string} formId - the ID of the form
 * @throws {FailedToReadFormError} - if the file does not exist or is empty
 */
export function getFormDefinition(formId) {
  return formDefinition.get(formId)
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
 * @typedef {import('./form-metadata-repository.js').DocumentWithId} DocumentWithId
 * @typedef {import('../types.js').FormConfiguration} FormConfiguration
 * @typedef {import('../types.js').FormConfigurationInput} FormConfigurationInput
 * @typedef {import('../types.js').FormConfigurationDocumentInput} FormConfigurationDocumentInput
 */
