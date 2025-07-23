import { PublishCommand } from '@aws-sdk/client-sns'
import {
  AuditEventMessageCategory,
  AuditEventMessageSchemaVersion,
  AuditEventMessageType
} from '@defra/forms-model'

import { config } from '~/src/config/index.js'
import { getSNSClient } from '~/src/helpers/sns.js'

const snsTopicArn = config.get('snsTopicArn')

const client = getSNSClient()

/**
 * Publish event onto topic
 * @param {Message} message
 */
export async function publishEvent(message) {
  const command = new PublishCommand({
    TopicArn: snsTopicArn,
    Message: JSON.stringify(message)
  })

  return client.send(command)
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

  return publishEvent(message)
}

/**
 * @import { FormMetadata, Message, FormCreatedMessage, FormCreatedMessageData } from '@defra/forms-model'
 */
