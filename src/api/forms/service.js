import { listForms as listFormMetadataEntries } from './form-metadata-repository'
import * as Types from '../api-types.js'

/**
 * Lists the available fforms
 * @returns {Promise<Types.FormConfiguration>} form configuration
 */
const listForms = async () => await listFormMetadataEntries()

export { listForms }
