import * as fs from 'fs/promises'
import { join } from 'path'
import { config } from '~/src/config'
// eslint-disable-next-line no-unused-vars
import * as Types from '../api-types.js'

// TODO look at prisma to generate this

const formDirectory = config.get('formDirectory')

/**
 * Returns the filename for a form metadata entry, given a form ID.
 * @param {string} formId ID of the form
 * @returns {string} file path
 */
const getFormMetadataFilename = (formId) => {
  return join(formDirectory, `${formId}-metadata.json`)
}

/**
 * Retrieves a file from the form store
 * @returns {Promise<Types.FormConfiguration[]>} form configuration
 */
const listForms = async () => {
  return fs.readdir(formDirectory).then(async (files) => {
    const response = []

    for (const fileName of files) {
      if (fileName.includes('-metadata.json')) {
        const formId = fileName.replace('-metadata.json', '')
        const fileJsonContent = await getFormMetadata(formId) // Added await here

        response.push(fileJsonContent)
      }
    }

    return response
  })
}

/**
 * Retrieves a file from the form store
 * @param {string} formId ID of the form
 * @return {Promise<import('../api-types.js').FormConfiguration[]>} form configuration
 */
const getFormMetadata = async (formId) => {
  const formMetadataFilename = getFormMetadataFilename(formId)
  const value = await fs.readFile(formMetadataFilename)
  return JSON.parse(value)
}

export { listForms }
