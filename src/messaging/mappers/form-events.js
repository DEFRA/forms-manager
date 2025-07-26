import {
  AuditEventMessageCategory,
  AuditEventMessageSchemaVersion,
  AuditEventMessageType
} from '@defra/forms-model'

import {
  createFormMessageDataBase,
  createV1MessageBase
} from '~/src/messaging/mappers/base.js'

/**
 * @param {FormMetadata} metadata
 * @returns {FormCreatedMessage}
 */
export function formCreatedEventMapper(metadata) {
  /** @type {FormCreatedMessageData} */
  const data = {
    formId: metadata.id,
    slug: metadata.slug,
    title: metadata.title,
    organisation: metadata.organisation,
    teamName: metadata.teamName,
    teamEmail: metadata.teamEmail
  }
  return {
    schemaVersion: AuditEventMessageSchemaVersion.V1,
    category: AuditEventMessageCategory.FORM,
    type: AuditEventMessageType.FORM_CREATED,
    entityId: metadata.id,
    createdAt: metadata.createdAt,
    createdBy: {
      id: metadata.createdBy.id,
      displayName: metadata.createdBy.displayName
    },
    data,
    messageCreatedAt: new Date()
  }
}

/**
 * @param {FormMetadata} metadata
 * @param {FormMetadata} oldMetadata
 * @returns {FormTitleUpdatedMessage}
 */
export function formTitleUpdatedMapper(metadata, oldMetadata) {
  const { title } = metadata
  const { title: oldTitle } = oldMetadata

  const baseData = createFormMessageDataBase(metadata)

  /**
   * @type {FormTitleUpdatedMessageData}
   */
  const data = {
    ...baseData,
    changes: {
      previous: {
        title: oldTitle
      },
      new: {
        title
      }
    }
  }
  const auditMessageBase = createV1MessageBase(metadata)

  return {
    ...auditMessageBase,
    data,
    category: AuditEventMessageCategory.FORM,
    type: AuditEventMessageType.FORM_TITLE_UPDATED
  }
}

/**
 * @param {FormMetadata} metadata
 * @param {PartialFormMetadataDocument} oldMetadata
 * @returns {FormTitleUpdatedMessage}
 */
export function formOrganisationUpdatedMapper(metadata, oldMetadata) {
  const { title } = metadata
  const { title: oldTitle } = oldMetadata

  const baseData = createFormMessageDataBase(metadata)

  /**
   * @type {FormTitleUpdatedMessageData}
   */
  const data = {
    ...baseData,
    changes: {
      previous: {
        title: oldTitle
      },
      new: {
        title
      }
    }
  }
  const auditMessageBase = createV1MessageBase(metadata)

  return {
    ...auditMessageBase,
    data,
    category: AuditEventMessageCategory.FORM,
    type: AuditEventMessageType.FORM_TITLE_UPDATED
  }
}

/**
 * @import { FormTitleUpdatedMessageData, FormMetadata, FormCreatedMessage, FormCreatedMessageData, FormTitleUpdatedMessage } from '@defra/forms-model'
 */
