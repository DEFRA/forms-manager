import author from '~/src/api/forms/service/__stubs__/author.js'

/**
 *
 * @param {Partial<PartialFormMetadataDocument>} partialFormMetadataDocument
 */
export function buildPartialFormMetadataDocument(partialFormMetadataDocument) {
  return {
    updatedAt: new Date('2025-07-26'),
    updatedBy: author,
    ...partialFormMetadataDocument
  }
}

/**
 * @import { PartialFormMetadataDocument } from '~/src/api/types.js'
 */
