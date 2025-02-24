import { createLogger } from '~/src/helpers/logging/logger.js'

export const logger = createLogger()
export const defaultAuthor = {
  displayName: 'Unknown',
  id: '-1'
}
export const defaultDate = new Date('2024-06-25T23:00:00Z') // date we went live
/**
 * @typedef {'draft' | 'live'} State
 */

export const DRAFT = /** @type {State} */ ('draft')
/**
 * Partially update the [state] fields
 * @param {Date} date
 * @param {FormMetadataAuthor} author
 * @param {string} state
 * @returns {PartialFormMetadataDocument}
 */
export const partialAuditFields = (date, author, state = DRAFT) => {
  return /** @type {PartialFormMetadataDocument} */ {
    [`${state}.updatedAt`]: date,
    [`${state}.updatedBy`]: author,
    updatedAt: date,
    updatedBy: author
  }
}
export const SUMMARY_PAGE_ID = '449a45f6-4541-4a46-91bd-8b8931b07b50'

export const MongoError = {
  DuplicateKey: 11000
}

/**
 * @import { FormMetadataAuthor } from '@defra/forms-model'
 * @import { PartialFormMetadataDocument } from '~/src/api/types.js'
 */
