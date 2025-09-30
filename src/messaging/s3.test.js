import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { buildDefinition } from '@defra/forms-model/stubs'
import { mockClient } from 'aws-sdk-client-mock'
import 'aws-sdk-client-mock-jest'

import { saveToS3 } from '~/src/messaging/s3.js'

jest.mock('~/src/config/index.js', () => {
  const testConfig = {
    awsRegion: 'eu-west-2',
    s3Endpoint: 'http://localhost',
    s3Bucket: 'form-definition-storage'
  }
  return {
    config: {
      get: jest.fn().mockImplementation((envName) => {
        // @ts-expect-error - untyped stub return value
        return testConfig[envName]
      })
    }
  }
})

describe('s3', () => {
  const s3Mock = mockClient(S3Client)

  afterEach(() => {
    s3Mock.reset()
  })

  describe('saveToS3', () => {
    it('should put the definition to s3 and return the version id', async () => {
      const definitionId = '6883d8667a2a64da10af4312'
      const filename = `${definitionId}.json`
      const definition = buildDefinition()
      s3Mock.on(PutObjectCommand).resolves({
        ETag: '"9b2cf535f27731c974343645a3985328"',
        VersionId: '3HL4kqtJlcpXrof3W3Zz4YBdvdz2FJ9n',
        $metadata: {
          httpStatusCode: 200,
          requestId: 'EXAMPLE1234567890',
          extendedRequestId: 'EXTENDED123...',
          cfId: 'CloudFrontIDIfApplicable',
          attempts: 1,
          totalRetryDelay: 0
        }
      })
      const result = await saveToS3(filename, definition)
      expect(result).toEqual({
        fileId: '3HL4kqtJlcpXrof3W3Zz4YBdvdz2FJ9n',
        filename,
        s3Key: 'audit-definitions/6883d8667a2a64da10af4312.json'
      })
      expect(s3Mock).toHaveReceivedCommandWith(PutObjectCommand, {
        Bucket: 'form-definition-storage',
        Key: 'audit-definitions/6883d8667a2a64da10af4312.json',
        Body: JSON.stringify(definition),
        ContentType: 'application/json'
      })
    })
  })
})
