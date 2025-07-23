import { PublishCommand, SNSClient } from '@aws-sdk/client-sns'
import { buildFormCreatedMessage } from '@defra/forms-model/stubs'
import { mockClient } from 'aws-sdk-client-mock'

import 'aws-sdk-client-mock-jest'
import { publishEvent } from '~/src/helpers/publish-base.js'

describe('publish-base', () => {
  const snsMock = mockClient(SNSClient)

  describe('publishEvent', () => {
    const message = buildFormCreatedMessage()
    it('should publish', async () => {
      await publishEvent(message)
      expect(snsMock).toHaveReceivedCommandWith(PublishCommand, {
        Message: JSON.stringify(message)
      })
    })
  })
})
