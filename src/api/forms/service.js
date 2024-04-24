import { Schema } from '@defra/forms-model'

import { InvalidFormDefinitionError } from '~/src/api/forms/errors.js'
import * as formDefinition from '~/src/api/forms/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/form-metadata-repository.js'
import * as formTemplates from '~/src/api/forms/templates.js'

/**
 * Maps a document to a FormConfiguration
 * @param {WithId<FormConfigurationDocument>} document - A mongo document
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

  // Create a blank form definition with the title set
  const definition = { ...formTemplates.empty(), name: title }

  // Validate the form definition
  const { error } = Schema.validate(definition)
  if (error) {
    throw new InvalidFormDefinitionError(error.message, {
      cause: error
    })
  }

  // Create the slug
  const slug = formTitleToSlug(title)

  /**
   * Create the configuration document
   * @satisfies {FormConfigurationDocument}
   */
  const document = { ...formConfigurationInput, slug }

  // Create the metadata document
  const { insertedId: _id } = await formMetadata.create(document)

  // Create the form definition
  await formDefinition.create(_id.toString(), definition)

  return mapForm({ ...document, _id })
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
 * Retrieves the form definition JSON content for a given form ID
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
 * @typedef {import('./errors.js').FormAlreadyExistsError} FormAlreadyExistsError
 * @typedef {import('../types.js').FormConfiguration} FormConfiguration
 * @typedef {import('../types.js').FormConfigurationDocument} FormConfigurationDocument
 * @typedef {import('../types.js').FormConfigurationInput} FormConfigurationInput
 */

/**
 * @template {object} Schema
 * @typedef {import('mongodb').WithId<Schema>} WithId
 */
