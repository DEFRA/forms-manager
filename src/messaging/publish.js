import {
  AuditEventMessageCategory,
  AuditEventMessageType,
  messageSchema
} from '@defra/forms-model'
import Joi from 'joi'

import {
  createFormMessageDataBase,
  createV1MessageBase
} from '~/src/messaging/mappers.js'
import { publishEvent } from '~/src/messaging/publish-base.js'

/**
 * Helper to publish form events
 * @param {AuditMessage} auditMessage
 * @returns {Promise<PublishCommandOutput>}
 */
async function publishFormEvent(auditMessage) {
  const value = Joi.attempt(auditMessage, messageSchema, {
    abortEarly: false
  })

  return publishEvent(value)
}

/**
 * Publish form created event
 * @param {FormMetadata} metadata
 */
export async function publishFormCreatedEvent(metadata) {
  /** @type {FormCreatedMessageData} */
  const data = {
    formId: metadata.id,
    slug: metadata.slug,
    title: metadata.title,
    organisation: metadata.organisation,
    teamName: metadata.teamName,
    teamEmail: metadata.teamEmail
  }

  const auditMessageBase = createV1MessageBase(metadata)

  return publishFormEvent({
    ...auditMessageBase,
    data,
    category: AuditEventMessageCategory.FORM,
    type: AuditEventMessageType.FORM_CREATED
  })
}

/**
 * @param {FormMetadata} metadata
 * @param {FormMetadata} oldMetadata
 * @returns {Promise<PublishCommandOutput>}
 */
export async function publishFormTitleUpdatedEvent(metadata, oldMetadata) {
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

  return publishFormEvent({
    ...auditMessageBase,
    data,
    category: AuditEventMessageCategory.FORM,
    type: AuditEventMessageType.FORM_TITLE_UPDATED
  })
}

/**
 * @import { FormTitleUpdatedMessageData, FormMetadata, AuditMessage, AuditChanges, FormCreatedMessage, FormCreatedMessageData, MessageBase, MessageData } from '@defra/forms-model'
 * @import { PublishCommandOutput } from '@aws-sdk/client-sns'
 */
