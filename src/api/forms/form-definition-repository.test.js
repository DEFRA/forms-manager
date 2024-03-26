import { Readable } from 'stream'

import { GetObjectCommand, NoSuchKey, S3Client } from '@aws-sdk/client-s3'
import { sdkStreamMixin } from '@smithy/util-stream'
import { mockClient } from 'aws-sdk-client-mock'

import { FailedToReadFormError } from './errors.js'
import { get } from './form-definition-repository.js'

const s3Mock = mockClient(S3Client)

describe('Get forms from S3', () => {
  beforeEach(() => {
    s3Mock.reset()
  })

  test('should retrieve form definition from S3', async () => {
    const stream = new Readable()
    stream.push(dummyFormDefinition)
    stream.push(null) // end of stream

    s3Mock.on(GetObjectCommand).resolvesOnce({ Body: sdkStreamMixin(stream) })

    const result = get('any-form-id')

    expect(result).resolves.toStrictEqual(JSON.parse(dummyFormDefinition))
  })

  test('should throw FailedToReadFormError if form definition is empty', async () => {
    s3Mock.on(GetObjectCommand).resolvesOnce({ Body: undefined })

    expect(() => get('any-form-id')).rejects.toThrow(FailedToReadFormError)
  })

  test('should throw FailedToReadFormError if form definition does not exist on disk', async () => {
    s3Mock
      .on(GetObjectCommand)
      .rejectsOnce(new NoSuchKey({ $metadata: {}, message: 'dummy error' }))

    expect(() => get('any-form-id')).rejects.toThrow(FailedToReadFormError)
  })

  test('should throw error if an unexpected error occurs', async () => {
    s3Mock.on(GetObjectCommand).rejectsOnce(new Error())

    expect(() => get('any-form-id')).rejects.toThrow(Error)
  })
})

// minify the JSON document for string equality checking, leave it full size for readability
const dummyFormDefinition = `
{
  "name": "",
  "startPage": "/page-one",
  "pages": [
    {
      "path": "/page-one",
      "title": "Page one",
      "components": [
        {
          "type": "TextField",
          "name": "textField",
          "title": "This is your first field",
          "hint": "Help text",
          "options": {},
          "schema": {}
        }
      ]
    }
  ],
  "conditions": [],
  "sections": [],
  "lists": []
}
`
