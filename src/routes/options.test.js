import {
  FormDefinitionError,
  FormDefinitionErrorType
} from '@defra/forms-model'

import { updateOptionOnDraftDefinition } from '~/src/api/forms/service/options.js'
import { createServer } from '~/src/api/server.js'
import { auth } from '~/test/fixtures/auth.js'

jest.mock('~/src/mongo.js')
jest.mock('~/src/api/forms/service/options.js')

describe('Options route', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(() => {
    return server.stop()
  })

  const okStatusCode = 200
  const badRequestStatusCode = 400
  const jsonContentType = 'application/json'
  const id = '661e4ca5039739ef2902b214'

  describe('Success responses', () => {
    test('Testing POST /forms/{id}/definition/draft/options/{optionName}', async () => {
      const payload = {
        optionValue: 'true'
      }

      const updateOption = jest
        .mocked(updateOptionOnDraftDefinition)
        // @ts-expect-error - type for testing
        .mockResolvedValueOnce({ showReferenceNumber: true })

      const response = await server.inject({
        method: 'POST',
        url: `/forms/${id}/definition/draft/options/showReferenceNumber`,
        payload,
        auth
      })

      expect(response.statusCode).toEqual(okStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toEqual({
        showReferenceNumber: true
      })
      const [, calledName, calledValue] = updateOption.mock.calls[0]
      expect(calledName).toBe('showReferenceNumber')
      expect(calledValue).toBe('true')
    })
  })

  describe('Error responses', () => {
    test('Testing POST /forms/{id}/definition/draft/options/{optionName} with invalid option returns validation errors', async () => {
      const payload = {
        invalidOptionValue: 'true'
      }

      const response = await server.inject({
        method: 'POST',
        url: `/forms/${id}/definition/draft/options/invalidName`,
        payload,
        auth
      })

      expect(response.statusCode).toEqual(badRequestStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toMatchObject({
        error: 'InvalidFormDefinitionError',
        message:
          '"optionValue" is required. "invalidOptionValue" is not allowed',
        statusCode: 400,
        cause: [
          {
            id: FormDefinitionError.Other,
            type: FormDefinitionErrorType.Type,
            message: '"optionValue" is required',
            detail: {
              label: 'optionValue',
              key: 'optionValue'
            }
          },
          {
            id: FormDefinitionError.Other,
            type: FormDefinitionErrorType.Type,
            message: '"invalidOptionValue" is not allowed',
            detail: {
              child: 'invalidOptionValue',
              label: 'invalidOptionValue',
              value: 'true',
              key: 'invalidOptionValue'
            }
          }
        ]
      })
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
