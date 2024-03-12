import { listForms as listFormMetadataEntries } from './form-metadata-repository'

/**
 * Lists the available fforms
 * @param {string} formId ID of the form
 * @return {Promise<FormConfiguration>} form configuration
 */
const listForms = async () => await listFormMetadataEntries()

export { listForms }
