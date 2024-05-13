import { Readable } from 'stream'

import {
  NoSuchKey,
  GetObjectCommand,
  S3Client,
  PutObjectCommand,
  CopyObjectCommand
} from '@aws-sdk/client-s3'
import { sdkStreamMixin } from '@smithy/util-stream'
import { mockClient } from 'aws-sdk-client-mock'

import * as draftFormDefinition from '~/src/api/forms/draft-form-definition-repository.js'
import { FailedToReadFormError } from '~/src/api/forms/errors.js'

const s3Mock = mockClient(S3Client)
const id = '661e4ca5039739ef2902b214'

/**
 * @satisfies {FormDefinition}
 */
const dummyFormDefinition = {
  name: '',
  startPage: '/page-one',
  pages: [
    {
      path: '/page-one',
      title: 'Page one',
      controller: './pages/summary.js',
      section: 'section',
      components: [
        {
          type: 'TextField',
          name: 'textField',
          title: 'This is your first field',
          hint: 'Help text',
          options: {},
          schema: {}
        }
      ]
    }
  ],
  conditions: [],
  sections: [
    {
      name: 'section',
      title: 'Section title',
      hideTitle: false
    }
  ],
  lists: [],
  feeOptions: {
    maxAttempts: 1,
    showPaymentSkippedWarningPage: false,
    allowSubmissionWithoutPayment: true
  },
  fees: [],
  outputs: []
}

describe('Create forms in S3', () => {
  beforeEach(() => {
    s3Mock.reset()
  })

  test('upload to s3 works', async () => {
    await draftFormDefinition.create(id, dummyFormDefinition)

    expect(s3Mock.commandCalls(PutObjectCommand)).toHaveLength(1)
  })
})

describe('Copy forms in S3', () => {
  beforeEach(() => {
    s3Mock.reset()
  })

  test('copy object in s3 works', async () => {
    await draftFormDefinition.createLiveFromDraft(id)

    expect(s3Mock.commandCalls(CopyObjectCommand)).toHaveLength(1)
  })
})

describe('Get forms from S3', () => {
  beforeEach(() => {
    s3Mock.reset()
  })

  test('should retrieve form definition from S3', async () => {
    const stream = new Readable()
    stream.push(JSON.stringify(dummyFormDefinition))
    stream.push(null) // end of stream

    s3Mock.on(GetObjectCommand).resolvesOnce({ Body: sdkStreamMixin(stream) })

    const result = draftFormDefinition.get('any-form-id')

    await expect(result).resolves.toStrictEqual(dummyFormDefinition)
  })

  test('should throw FailedToReadFormError if form definition is empty', async () => {
    s3Mock.on(GetObjectCommand).resolvesOnce({ Body: undefined })

    await expect(() => draftFormDefinition.get('any-form-id')).rejects.toThrow(
      FailedToReadFormError
    )
  })

  test('should throw FailedToReadFormError if form definition does not exist on disk', async () => {
    s3Mock
      .on(GetObjectCommand)
      .rejectsOnce(new NoSuchKey({ $metadata: {}, message: 'dummy error' }))

    await expect(() => draftFormDefinition.get('any-form-id')).rejects.toThrow(
      FailedToReadFormError
    )
  })

  test('should throw error if an unexpected error occurs', async () => {
    s3Mock.on(GetObjectCommand).rejectsOnce(new Error())

    await expect(() => draftFormDefinition.get('any-form-id')).rejects.toThrow(
      Error
    )
  })
})

/**
 * @typedef {import('@defra/forms-model').FormDefinition} FormDefinition
 */
