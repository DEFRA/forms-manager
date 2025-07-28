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
    createdAt: metadata.updatedAt,
    createdBy: {
      id: metadata.updatedBy.id,
      displayName: metadata.updatedBy.displayName
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
 * @import { FormMessageDataBase, FormMetadata, MessageBase } from '@defra/forms-model'
 */
