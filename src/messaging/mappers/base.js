import { AuditEventMessageSchemaVersion } from '@defra/forms-model'

/**
 * Helper to create the base message
 * @param {FormMetadata} metadata
 * @returns {Omit<MessageBase, 'category'|'type'>}
 */
export function createV1MessageBase(metadata) {
  return {
    schemaVersion: AuditEventMessageSchemaVersion.V1,
    entityId: metadata.id,
    createdAt: metadata.createdAt,
    createdBy: {
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
 */
