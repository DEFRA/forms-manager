import { ListTopicsCommand, SNSClient } from '@aws-sdk/client-sns'

import { config } from '~/src/config/index.js'

const awsRegion = config.get('awsRegion')
const snsEndpoint = config.get('snsEndpoint')

/**
 * Get the topics
 */
export async function listTopics() {
  const client = getSNSClient()
  const command = new ListTopicsCommand({})

  return client.send(command)
}

/**
 * Retrieves an SNS client
 * @returns {SNSClient}
 */
export function getSNSClient() {
  return new SNSClient({
    region: awsRegion,
    endpoint: snsEndpoint
  })
}
