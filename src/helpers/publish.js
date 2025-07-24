import {
  AuditEventMessageCategory,
  AuditEventMessageSchemaVersion,
  AuditEventMessageType,
  messageSchema
} from '@defra/forms-model'

import { publishEvent } from '~/src/helpers/publish-base.js'

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

  /** @type {FormCreatedMessage} */
  const message = {
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

  const { value, error } = messageSchema.validate(message, {
    abortEarly: false
  })

  if (error) {
    throw error
  }

  return publishEvent(value)
}

/**
 * @import { FormMetadata, Message, FormCreatedMessage, FormCreatedMessageData } from '@defra/forms-model'
 */
