import { existsFormSecret, getFormSecret, saveFormSecret } from '~/src/api/forms/service/secrets.js'
import { createServer } from '~/src/api/server.js'
import { auth } from '~/test/fixtures/auth.js'

jest.mock('~/src/mongo.js')
jest.mock('~/src/api/forms/service/secrets.js')

describe('Secrets routes', () => {
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
    test('Testing GET /forms/{id}/secrets/{name}', async () => {
      jest.mocked(getFormSecret).mockResolvedValueOnce('secret result')

      const response = await server.inject({
        method: 'GET',
        url: `/forms/${id}/secrets/my-new-secret`,
        auth
      })

      expect(response.statusCode).toEqual(okStatusCode)
      expect(response.result).toBe('secret result')
    })

    test('Testing GET /forms/{id}/secrets/{name}/exists', async () => {
      jest.mocked(existsFormSecret).mockResolvedValueOnce(true)

      const response = await server.inject({
        method: 'GET',
        url: `/forms/${id}/secrets/my-new-secret/exists`,
        auth
      })

      expect(response.statusCode).toEqual(okStatusCode)
      expect(response.result).toBe(true)
    })

    test('Testing POST /forms/{id}/secrets/{name}', async () => {
      const payload = {
        secretValue: 'My new secret value'
      }

      const saveSecret = jest.mocked(saveFormSecret)

      const response = await server.inject({
        method: 'POST',
        url: `/forms/${id}/secrets/my-new-secret`,
        payload,
        auth
      })

      expect(response.statusCode).toEqual(okStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toBe(okStatusCode)
      const [, calledName, calledValue] = saveSecret.mock.calls[0]
      expect(calledName).toBe('my-new-secret')
      expect(calledValue).toBe('My new secret value')
    })
  })

  describe('Error responses', () => {
    test('Testing POST /forms/{id}/secrets/{name} with invalid payload returns validation errors', async () => {
      const payload = {
        invalidSecretValue: 'invalid'
      }

      const response = await server.inject({
        method: 'POST',
        url: `/forms/${id}/secrets/my-secret-name`,
        payload,
        auth
      })

      expect(response.statusCode).toEqual(badRequestStatusCode)
      expect(response.headers['content-type']).toContain(jsonContentType)
      expect(response.result).toMatchObject({
        error: 'Bad Request',
        message:
          '"secretValue" is required. "invalidSecretValue" is not allowed'
      })
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
