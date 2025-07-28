import { PublishCommand } from '@aws-sdk/client-sns'

import { logger } from '~/src/api/forms/service/shared.js'
import { config } from '~/src/config/index.js'
import { getSNSClient } from '~/src/messaging/sns.js'

const snsTopicArn = config.get('snsTopicArn')

const client = getSNSClient()

/**
 * Publish event onto topic
 * @param {AuditMessage} message
 */
export async function publishEvent(message) {
  const shouldPublish = config.get('publishAuditEvents')

  if (shouldPublish) {
    const command = new PublishCommand({
      TopicArn: snsTopicArn,
      Message: JSON.stringify(message)
    })

    const result = await client.send(command)

    logger.info(
      `Published ${message.type} event for formId ${message.entityId}. MessageId: ${result.MessageId}`
    )

    return result
  }

  return undefined
}

/**
 * @import { AuditMessage } from '@defra/forms-model'
 */
