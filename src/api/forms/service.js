import { listForms as listFormMetadataEntries } from './form-metadata-repository.js'

/**
 * Lists the available forms
 * @returns {Promise<FormConfiguration[]>} - form configuration
 */
export const listForms = () => listFormMetadataEntries()

/**
 * @typedef {import('../types.js').FormConfiguration} FormConfiguration
 */
