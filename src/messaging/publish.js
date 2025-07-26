import { messageSchema } from '@defra/forms-model'
import Joi from 'joi'

import {
  formCreatedEventMapper,
  formTitleUpdatedMapper
} from '~/src/messaging/mappers/form-events.js'
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
  const auditMessage = formCreatedEventMapper(metadata)

  return publishFormEvent(auditMessage)
}

/**
 * Publishes a form title updated event
 * @param {FormMetadata} metadata
 * @param {FormMetadata} oldMetadata
 */
export async function publishFormTitleUpdatedEvent(metadata, oldMetadata) {
  const auditMessage = formTitleUpdatedMapper(metadata, oldMetadata)

  return publishFormEvent(auditMessage)
}

/**
 * @param {AuditMessage[]} messages
 * @returns {Promise<{ messageId?: string; eventType: AuditEventMessageType }[]>}
 */
export async function bulkPublishEvents(messages) {
  const messagePromises = messages.map((message) => publishFormEvent(message))

  const settledPromises = await Promise.allSettled(messagePromises)

  return settledPromises.map((settledPromise, idx) => {
    const eventType = messages[idx].type

    if (settledPromise.status === 'rejected') {
      return {
        eventType
      }
    }

    return {
      eventType,
      messageId: settledPromise.value.MessageId
    }
  })
}
/**
 * @import { FormTitleUpdatedMessageData, AuditEventMessageType, FormMetadata, AuditMessage, FormCreatedMessage, FormCreatedMessageData, MessageBase, MessageData } from '@defra/forms-model'
 * @import { PublishCommandOutput } from '@aws-sdk/client-sns'
 */
