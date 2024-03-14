import * as Types from '../types.js'

import { listForms as listFormMetadataEntries } from './form-metadata-repository.js'

/**
 * Lists the available forms
 * @returns {Promise<Types.FormConfiguration>} form configuration
 */
export const listForms = async () => await listFormMetadataEntries()
