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
    createdAt: updatedForm.updatedAt,
    createdBy: {
      id: updatedForm.updatedBy.id,
      displayName: updatedForm.updatedBy.displayName
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
 */
