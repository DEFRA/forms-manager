import { AuditEventMessageSchemaVersion } from '@defra/forms-model'

/**
 * Helper to create the base message
 * @param {FormMetadata} metadata
 * @param {PartialFormMetadataDocument} updatedForm
 * @returns {Omit<MessageBase, 'category'|'type'>}
 */
export function createV1MessageBase(metadata, updatedForm) {
  return {
    schemaVersion: AuditEventMessageSchemaVersion.V1,
    entityId: metadata.id,
    createdAt: updatedForm.updatedAt ?? metadata.createdAt,
    createdBy: updatedForm.updatedBy?.id
      ? {
          id: updatedForm.updatedBy.id,
          displayName: updatedForm.updatedBy.displayName
        }
      : {
          id: metadata.createdBy.id,
          displayName: metadata.createdBy.displayName
        },
    messageCreatedAt: new Date()
  }
}

/**
 *
 * @param {FormMetadata} metadata
 * @returns {FormMessageDataBase}
 */
export function createFormMessageDataBase(metadata) {
  return {
    formId: metadata.id,
    slug: metadata.slug
  }
}
/**
 * @import { FormMessageDataBase, ChangesMessageData, AuditEventMessageType, FormMessageChangesData, FormMetadata, MessageBase } from '@defra/forms-model'
 * @import { PartialFormMetadataDocument } from '~/src/api/types.js'
 */
