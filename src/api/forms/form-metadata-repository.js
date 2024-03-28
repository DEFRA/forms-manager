import { existsSync } from 'node:fs'
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
  const files = existsSync(formDirectory)
    ? await readdir(formDirectory, { withFileTypes: true })
    : []

  const formIds = files
    .filter((entry) => entry.name.includes('-metadata.json'))
    .map((entry) => entry.name.replace('-metadata.json', ''))

  return Promise.all(formIds.map(get))
}

/**
 * Retrieves a file from the form store
 * @param {string} formId - ID of the form
 * @returns {Promise<FormConfiguration>} - form configuration
 */
export function get(formId) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- Allow JSON type 'any'
  return readFile(getFormMetadataFilename(formId), 'utf-8').then(JSON.parse)
}

/**
 * @param {string} formId
 * @returns {Promise<boolean>} - whether the form exists
 */
export async function exists(formId) {
  // crude check as we'll move to mongo ASAP
  try {
    await get(formId)
    return true
  } catch {
    return false
  }
}

/**
 * Adds a form to the Form Store
 * @param {FormConfiguration} formConfiguration - form configuration
 * @returns {Promise<void>}
 */
export function create(formConfiguration) {
  const formMetadataFilename = getFormMetadataFilename(formConfiguration.id)
  const formMetadataString = JSON.stringify(formConfiguration, undefined, 2)
  return writeFile(formMetadataFilename, formMetadataString, 'utf8')
}

/**
 * @typedef {import('../types.js').FormConfiguration} FormConfiguration
 */
