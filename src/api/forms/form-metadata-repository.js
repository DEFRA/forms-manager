import { readdir, readFile } from 'node:fs/promises'
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
export async function listForms() {
  const files = await readdir(formDirectory)

  const formIds = files
    .filter((fileName) => fileName.includes('-metadata.json'))
    .map((fileName) => fileName.replace('-metadata.json', ''))

  return Promise.all(formIds.map(getFormMetadata))
}

/**
 * Retrieves a file from the form store
 * @param {string} formId - ID of the form
 * @returns {Promise<FormConfiguration>} - form configuration
 */
export async function getFormMetadata(formId) {
  const formMetadataFilename = getFormMetadataFilename(formId)
  const value = await readFile(formMetadataFilename, { encoding: 'utf8' })
  return JSON.parse(value)
}

/**
 * @typedef {import('../types.js').FormConfiguration} FormConfiguration
 */
