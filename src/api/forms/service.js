import { readFile } from 'node:fs/promises'

import { Schema } from '@defra/forms-model'

import {
  FailedCreationOperationError,
  FormAlreadyExistsError,
  InvalidFormDefinitionError
} from '~/src/api/forms/errors.js'
import * as formDefinition from '~/src/api/forms/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/form-metadata-repository.js'
import { createLogger } from '~/src/helpers/logging/logger.js'

const logger = createLogger()

/**
 * Adds an empty form
 * @param {FormConfigurationInput} formConfigurationInput - the desired form configuration to save
 * @returns {Promise<FormConfiguration>} - the saved form configuration
 * @throws {FormAlreadyExistsError} - if the form already exists
 * @throws {InvalidFormDefinitionError} - if the form definition is invalid
 * @throws {FailedCreationOperationError} - if the form metadata/def couldn't be persisted
 */
export async function createForm(formConfigurationInput) {
  const emptyForm = await retrieveEmptyForm()
  const formId = formTitleToId(formConfigurationInput.title)

  if (await formMetadata.exists(formId)) {
    throw new FormAlreadyExistsError(formId)
  }

  // construct the new form config. the ID is always set server-side.
  const formConfiguration = { ...formConfigurationInput, id: formId }

  // create the form object. At this point, we're just creating a blank
  // form following the one-page template, we just set the title per the user request.
  const shallowCloneForm = { ...emptyForm, name: formConfiguration.title }

  const { error } = Schema.validate(shallowCloneForm)
  if (error) {
    throw new InvalidFormDefinitionError(error.message, {
      cause: error
    })
  }

  try {
    await formDefinition.create(formConfiguration, shallowCloneForm)
    await formMetadata.create(formConfiguration)
  } catch (error) {
    logger.error(error, "Failed to persist, couldn't create form.")
    throw new FailedCreationOperationError()
  }

  return formConfiguration
}

/**
 * Lists the available forms
 * @returns {Promise<FormConfiguration[]>} - form configuration
 */
export function listForms() {
  return formMetadata.list()
}

/**
 * Retrieves a form configuration
 * @param {string} formId - ID of the form
 * @returns {Promise<FormConfiguration>} - form configuration
 */
export function getForm(formId) {
  return formMetadata.get(formId)
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
 * @returns {Promise<FormDefinition>} - the empty form configuration
 * @throws {InvalidFormDefinitionError} - if the base form definition is invalid
 */
async function retrieveEmptyForm() {
  const fileContent = await readFile(
    new URL('./empty-form.json', import.meta.url).pathname,
    'utf-8'
  )

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Allow JSON type 'any'
    const emptyForm = /** @type {import('./empty-form.json')} */ (
      JSON.parse(fileContent)
    )

    const validationResult = Schema.validate(emptyForm)

    if (validationResult.error) {
      throw new InvalidFormDefinitionError(
        'Invalid form schema provided. Please check the empty-form.json file.'
      )
    }

    // @ts-expect-error Allow missing fees, outputs, feeOptions in empty form
    return emptyForm
  } catch (cause) {
    throw new InvalidFormDefinitionError(
      'Failed to parse empty-form.json as JSON. Please validate contents.',
      { cause }
    )
  }
}

/**
 * @typedef {import('../types.js').FormConfiguration} FormConfiguration
 * @typedef {import('../types.js').FormConfigurationInput} FormConfigurationInput
 * @typedef {import('@defra/forms-model').FormDefinition} FormDefinition
 */
