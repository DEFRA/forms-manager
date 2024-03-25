import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { config } from '~/src/config/index.js'

// TODO look at prisma to generate this

const formDirectory = config.get('formDirectory')

/**
 * Returns the filename for a form metadata entry, given a form ID.
 * @param {string} formId - ID of the form
 * @returns {string} - file path
 */
const getFormMetadataFilename = (formId) => {
  return join(formDirectory, `${formId}-metadata.json`)
}

/**
 * Retrieves a file from the form store
 * @returns {Promise<FormConfiguration[]>} - form configuration
 */
export async function list() {
  const files = await readdir(formDirectory)

  const formIds = files
    .filter((fileName) => fileName.includes('-metadata.json'))
    .map((fileName) => fileName.replace('-metadata.json', ''))

  return Promise.all(formIds.map(get))
}

/**
 * Retrieves a file from the form store
 * @param {string} formId - ID of the form
 * @returns {Promise<FormConfiguration>} - form configuration
 */
export async function get(formId) {
  const formMetadataFilename = getFormMetadataFilename(formId)
  const value = await readFile(formMetadataFilename, { encoding: 'utf8' })
  return JSON.parse(value)
}

/**
 * @param {string} formId
 * @returns {Promise<boolean>} - whether the form exists
 */
export async function exists(formId) {
  // crude check as we'll move to mongo ASAP
  return get(formId)
    .then(() => true)
    .catch(() => false)
}

/**
 * Adds a form to the Form Store
 * @param {FormConfiguration} formConfiguration - form configuration
 * @returns {Promise<void>}
 */
export async function create(formConfiguration) {
  const formMetadataFilename = getFormMetadataFilename(formConfiguration.id)
  const formMetadataString = JSON.stringify(formConfiguration)
  return writeFile(formMetadataFilename, formMetadataString, 'utf8')
}

/**
 * @typedef {import('../types.js').FormConfiguration} FormConfiguration
 */
