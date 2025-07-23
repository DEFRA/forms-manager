import { PublishCommand } from '@aws-sdk/client-sns'

import { config } from '~/src/config/index.js'
import { getSNSClient } from '~/src/helpers/sns.js'

const snsTopicArn = config.get('snsTopicArn')

const client = getSNSClient()

/**
 * Publish event onto topic
 * @param {Message} message
 */
export function publishEvent(message) {
  const command = new PublishCommand({
    TopicArn: snsTopicArn,
    Message: JSON.stringify(message)
  })

  return client.send(command)
}

/**
 * @import { FormMetadata, Message, FormCreatedMessage, FormCreatedMessageData } from '@defra/forms-model'
 */
