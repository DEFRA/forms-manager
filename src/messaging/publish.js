import {
  AuditEventMessageCategory,
  AuditEventMessageSchemaVersion,
  AuditEventMessageType,
  messageSchema
} from '@defra/forms-model'
import Joi from 'joi'

import { publishEvent } from '~/src/messaging/publish-base.js'

/**
 * Publish form created event
 * @param {FormMetadata} metadata
 */
export function publishFormCreatedEvent(metadata) {
  /** @type {FormCreatedMessageData} */
  const data = {
    formId: metadata.id,
    slug: metadata.slug,
    title: metadata.title,
    organisation: metadata.organisation,
    teamName: metadata.teamName,
    teamEmail: metadata.teamEmail
  }

  /** @type {FormCreatedMessage} */
  const message = {
    messageCreatedAt: new Date(),
    entityId: metadata.id,
    schemaVersion: AuditEventMessageSchemaVersion.V1,
    category: AuditEventMessageCategory.FORM,
    type: AuditEventMessageType.FORM_CREATED,
    createdAt: metadata.createdAt,
    createdBy: {
      id: metadata.createdBy.id,
      displayName: metadata.createdBy.displayName
    },
    data
  }

  const value = Joi.attempt(message, messageSchema, {
    abortEarly: false
  })

  return publishEvent(value)
}

/**
 * @import { FormMetadata, Message, FormCreatedMessage, FormCreatedMessageData } from '@defra/forms-model'
 */
