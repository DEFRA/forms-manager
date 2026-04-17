/**
 * Map from FormMetadataDocument to FormMetadata
 * @param { WithId<Partial<FormMetadataDocument>> | null } metadataDoc
 */
export function mapMetadata(metadataDoc) {
  const formId = metadataDoc?._id.toString()
  return /** @type {FormMetadata} */ ({
    ...metadataDoc,
    id: formId
  })
}

/**
 * @import { WithId } from 'mongodb'
 * @import { FormMetadata, FormMetadataDocument } from '@defra/forms-model'
 */
