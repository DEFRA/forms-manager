import { readFileSync } from 'node:fs'

import { Schema } from '@defra/forms-model'

import {
  createFormDefinition,
  getFormDefinition as getFormDefinitionFromRepository
} from './form-definition-repository.js'
import {
  createFormMetadata,
  listForms as listFormMetadataEntries,
  exists as formMetadataExists,
  getFormMetadata
} from './form-metadata-repository.js'

const emptyForm = retrieveEmptyForm()

/**
 * Adds an empty form
 * @param {import('../types.js').FormConfigurationInput} formConfiguration - the desired form configuration to save
 * @returns {Promise<FormConfiguration>} - the saved form configuration
 */
export async function createForm(formConfiguration) {
  const formId = formTitleToId(formConfiguration.title)

  if (formConfiguration.id) {
    throw new Error(`Form ID cannot be manually set. Please remove this field.`)
  }

  if (await formMetadataExists(formId)) {
    throw new Error(`Form with ID ${formId} already exists`)
  }

  const shallowCloneForm = { ...emptyForm }
  formConfiguration.id = formId
  shallowCloneForm.formId = formId

  return createFormDefinition(formConfiguration, shallowCloneForm)
    .then(() => createFormMetadata(formConfiguration))
    .then(() => formConfiguration)
}

/**
 * Lists the available forms
 * @returns {Promise<FormConfiguration[]>} - form configuration
 */
export async function listForms() {
  return listFormMetadataEntries()
}

/**
 * Retrieves a form configuration
 * @param {string} formId - ID of the form
 * @returns {Promise<FormConfiguration>} - form configuration
 */
export async function getForm(formId) {
  return getFormMetadata(formId)
}

/**
 * Retrieves the form definition for a given form ID
 * @param {string} formId - the ID of the form
 * @returns {Promise<string>} - form definition JSON content
 */
export async function getFormDefinition(formId) {
  return getFormDefinitionFromRepository(formId)
}

/**
 * Given a form title, returns the ID of the form.
 * E.g. "Hello - world" -> "hello-world".
 * @param {string} formTitle - title of the form
 * @returns {string} - ID of the form
 */
function formTitleToId(formTitle) {
  return formTitle
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '') // remove any non-alphanumeric characters
    .replace(/\s+/g, ' ') // replace any whitespaces with a single space
    .replace(/ /g, '-') // replace any spaces with a hyphen
}

/**
 * Retrieves the empty form configuration
 * @returns {object} - the empty form configuration
 */
function retrieveEmptyForm() {
  const emptyForm = JSON.parse(
    readFileSync(
      new URL('./empty-form.json', import.meta.url).pathname,
      'utf-8'
    )
  )

  const validationResult = Schema.validate(emptyForm)

  if (validationResult.error) {
    throw new Error(
      'Invalid form schema provided. Please check the empty-form.json file.'
    )
  }

  return emptyForm
}

/**
 * @typedef {import('../types.js').FormConfiguration} FormConfiguration
 */
