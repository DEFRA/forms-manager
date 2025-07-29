import { messageSchema } from '@defra/forms-model'
import Joi from 'joi'

import {
  formCreatedEventMapper,
  formTitleUpdatedMapper
} from '~/src/messaging/mappers/form-events.js'
import { publishEvent } from '~/src/messaging/publish-base.js'

/**
 * Helper to validate and publish an event
 * @param {AuditMessage} auditMessage
 */
async function validateAndPublishEvent(auditMessage) {
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

  return validateAndPublishEvent(auditMessage)
}

/**
 * Publishes a form title updated event
 * @param {FormMetadata} metadata
 * @param {FormMetadata} oldMetadata
 */
export async function publishFormTitleUpdatedEvent(metadata, oldMetadata) {
  const auditMessage = formTitleUpdatedMapper(metadata, oldMetadata)

  return validateAndPublishEvent(auditMessage)
}

/**
 * @param {AuditMessage[]} messages
 * @returns {Promise<{ messageId?: string; type: AuditEventMessageType }[]>}
 */
export async function bulkPublishEvents(messages) {
  const messagePromises = messages.map((message) =>
    validateAndPublishEvent(message)
  )

  const publishResults = await Promise.all(messagePromises)

  return publishResults.map((publishResult, idx) => {
    const type = messages[idx].type
    return {
      type,
      messageId: publishResult?.MessageId
    }
  })
}

/**
 * @import { AuditEventMessageType, FormMetadata, AuditMessage } from '@defra/forms-model'
 */
