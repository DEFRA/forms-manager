import { PublishCommand } from '@aws-sdk/client-sns'

import { config } from '~/src/config/index.js'
import { getSNSClient } from '~/src/messaging/sns.js'

const snsTopicArn = config.get('snsTopicArn')

const client = getSNSClient()

/**
 * Publish event onto topic
 * @param {AuditMessage} message
 * @returns {Promise<PublishCommandOutput>}
 */
export async function publishEvent(message) {
  const shouldPublish = config.get('publishAuditEvents')

  if (shouldPublish) {
    const command = new PublishCommand({
      TopicArn: snsTopicArn,
      Message: JSON.stringify(message)
    })
    return client.send(command)
  }

  return {
    MessageId: undefined,
    SequenceNumber: undefined,
    $metadata: {}
  }
}

/**
 * @import { PublishCommandOutput } from '@aws-sdk/client-sns'
 * @import { FormMetadata, AuditMessage, FormCreatedMessage, FormCreatedMessageData } from '@defra/forms-model'
 */
