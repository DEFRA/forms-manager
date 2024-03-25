import { writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { config } from '~/src/config/index.js'

const formDirectory = config.get('formDirectory')

/**
 * Gets a filename for a given form ID
 * @param {string} formId - the form ID
 * @returns - the path to the form definition file
 */
function getFormDefinitionFilename(formId) {
  return join(formDirectory, `${formId}.json`)
}

/**
 * Adds a form to the Form Store
 * @param {import('../types.js').FormConfiguration} formConfiguration - form configuration
 * @param {object} formDefinition - form definition (JSON object)
 */
export async function create(formConfiguration, formDefinition) {
  const formDefinitionFilename = getFormDefinitionFilename(formConfiguration.id)

  // Convert formMetadata to JSON string
  const formDefinitionString = JSON.stringify(formDefinition)

  // Write formDefinition to file
  await writeFile(formDefinitionFilename, formDefinitionString)
}

/**
 * Retrieves the form definition for a given form ID
 * @param {string} formId - the ID of the form
 * @returns {Promise<string>} - form definition JSON content
 */
export async function get(formId) {
  return readFile(getFormDefinitionFilename(formId), 'utf-8').then(JSON.parse)
}
