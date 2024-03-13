import {
  listForms as listFormMetadataEntries,
  getFormMetadata
} from './form-metadata-repository.js'

/**
 * Lists the available forms
 * @returns {Promise<FormConfiguration[]>} - form configuration
 */
export function listForms() {
  return listFormMetadataEntries()
}

/**
 * Retrieves a form (metadata + form definition)
 * @param {string} formId - ID of the form
 * @returns {Promise<FormConfiguration>} - form configuration
 */
export function getForm(formId) {
  return getFormMetadata(formId)
}

/**
 * @typedef {import('../types.js').FormConfiguration} FormConfiguration
 */
