import { Schema } from '@defra/forms-model'

import { emptyForm } from '~/src/api/forms/empty-form.js'
import { InvalidFormDefinitionError } from '~/src/api/forms/errors.js'
import * as formDefinition from '~/src/api/forms/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/form-metadata-repository.js'

/**
 * Adds an empty form
 * @param {FormConfigurationInput} formConfigurationInput - the desired form configuration to save
 * @param {Request} request - the hapi request object
 * @returns {Promise<FormConfiguration>} - the saved form configuration
 * @throws {InvalidFormDefinitionError} - if the form definition is invalid
 */
export async function createForm(formConfigurationInput, request) {
  const { db } = request
  const { title } = formConfigurationInput

  // Create the slug
  const linkIdentifier = formTitleToSlug(title)
  const metadata = { ...formConfigurationInput, linkIdentifier }

  // Create the metadata document
  const insertResult = await formMetadata.create(metadata, db)
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

  return metadata
}

/**
 * Lists the available forms
 * @param {Request} request - the hapi request object
 * @returns {Promise<FormConfiguration[]>} - form configuration
 */
export function listForms(request) {
  const { db } = request

  return formMetadata.list(db)
}

/**
 * Retrieves a form configuration
 * @param {string} formId - ID of the form
 * @param {Request} request - the hapi request object
 * @returns {Promise<FormConfiguration | undefined>} - form configuration
 */
export async function getForm(formId, request) {
  const { db } = request
  const metadata = await formMetadata.get(formId, db)

  return metadata ?? undefined
}

/**
 * Retrieves the form definition for a given form ID
 * @param {string} formId - the ID of the form
 * @returns {Promise<FormDefinition>} - form definition JSON content
 */
export function getFormDefinition(formId) {
  return formDefinition.get(formId)
}

/**
 * Given a form title, returns the slug of the form.
 * E.g. "Hello - world" -> "hello-world".
 * @param {string} title - title of the form
 * @returns {string} - ID of the form
 */
function formTitleToSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '') // remove any non-alphanumeric characters
    .replace(/\s+/g, ' ') // replace any whitespaces with a single space
    .replace(/ /g, '-') // replace any spaces with a hyphen
}

/**
 * @typedef {import('@hapi/hapi').Request} Request
 * @typedef {import('../types.js').FormConfiguration} FormConfiguration
 * @typedef {import('../types.js').FormConfigurationInput} FormConfigurationInput
 * @typedef {import('@defra/forms-model').FormDefinition} FormDefinition
 */
