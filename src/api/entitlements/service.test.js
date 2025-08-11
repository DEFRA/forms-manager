import Boom from '@hapi/boom'

describe('entitlements service', () => {
  /** @type {any} */
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }

  /** @type {() => string[]} */
  let getDefaultScopes
  /** @type {(oid: string, authToken?: string) => Promise<string[]>} */
  let getUserScopes
  /** @type {any} */
  let getJson

  beforeEach(async () => {
    jest.resetModules()
    jest.clearAllMocks()

    jest.doMock('~/src/lib/fetch.js')
    jest.doMock('~/src/config/index.js', () => ({
      config: {
        get: jest.fn((key) => {
          if (key === 'entitlementUrl') return 'http://localhost:3003'
          if (key === 'log') {
            return {
              enabled: true,
              level: 'info',
              format: 'ecs',
              redact: []
            }
          }
          if (key === 'serviceName') return 'forms-manager'
          if (key === 'serviceVersion') return '1.0.0'
          return 'mock-value'
        })
      }
    }))
    jest.doMock('~/src/helpers/logging/logger.js', () => ({
      createLogger: jest.fn().mockReturnValue(mockLogger)
    }))

    const fetchModule = await import('~/src/lib/fetch.js')
    getJson = /** @type {any} */ (fetchModule.getJson)

    const serviceModule = await import('~/src/api/entitlements/service.js')
    getDefaultScopes = serviceModule.getDefaultScopes
    getUserScopes = serviceModule.getUserScopes
  })

  describe('getUserScopes', () => {
    const testOid = 'test-user-oid'
    const testToken = 'test-auth-token'

    it('should return scopes array when API call is successful', async () => {
      const mockScopes = ['read', 'write', 'admin']
      getJson.mockResolvedValue({
        response: { statusCode: 200 },
        body: {
          entity: {
            userId: testOid,
            scopes: mockScopes
          }
        }
      })

      const result = await getUserScopes(testOid, testToken)

      expect(result).toEqual(mockScopes)
      expect(getJson).toHaveBeenCalledWith(
        new URL(`http://localhost:3003/users/${testOid}`),
        {
          headers: {
            Authorization: `Bearer ${testToken}`
          }
        }
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        `[entitlementsApi] Fetching scopes for user ${testOid}`
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        `[entitlementsApi] Retrieved 3 scopes for user ${testOid}`
      )
    })

    it('should return empty array when response does not have entity.scopes', async () => {
      getJson.mockResolvedValue({
        response: { statusCode: 200 },
        body: { invalid: 'response' }
      })

      const result = await getUserScopes(testOid, testToken)

      expect(result).toEqual([])
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `[entitlementsApi] Invalid response format for user ${testOid}, expected entity object with scopes array`
      )
    })

    it('should return empty array when API call fails with Boom error', async () => {
      const boomError = Boom.notFound('Not found')
      getJson.mockRejectedValue(boomError)

      const result = await getUserScopes(testOid, testToken)

      expect(result).toEqual([])
      expect(mockLogger.error).toHaveBeenCalledWith(
        `[entitlementsApi] Failed to fetch scopes for user ${testOid}`,
        boomError
      )
    })

    it('should return empty array when API call fails with generic error', async () => {
      const error = new Error('Network error')
      getJson.mockRejectedValue(error)

      const result = await getUserScopes(testOid, testToken)

      expect(result).toEqual([])
      expect(mockLogger.error).toHaveBeenCalledWith(
        `[entitlementsApi] Failed to fetch scopes for user ${testOid}:`,
        error
      )
    })

    it('should handle null body gracefully', async () => {
      getJson.mockResolvedValue({ response: { statusCode: 200 }, body: null })

      const result = await getUserScopes(testOid, testToken)

      expect(result).toEqual([])
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `[entitlementsApi] Invalid response format for user ${testOid}, expected entity object with scopes array`
      )
    })

    it('should handle undefined body gracefully', async () => {
      getJson.mockResolvedValue({
        response: { statusCode: 200 },
        body: undefined
      })

      const result = await getUserScopes(testOid, testToken)

      expect(result).toEqual([])
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `[entitlementsApi] Invalid response format for user ${testOid}, expected entity object with scopes array`
      )
    })

    it('should call API without auth header when no token provided', async () => {
      const mockScopes = ['read', 'write']
      getJson.mockResolvedValue({
        response: { statusCode: 200 },
        body: {
          entity: {
            userId: testOid,
            scopes: mockScopes
          }
        }
      })

      const result = await getUserScopes(testOid)

      expect(result).toEqual(mockScopes)
      expect(getJson).toHaveBeenCalledWith(
        new URL(`http://localhost:3003/users/${testOid}`),
        {}
      )
    })
  })

  describe('getDefaultScopes', () => {
    it('should return admin scopes', () => {
      const result = getDefaultScopes()

      expect(result).toEqual([
        'form-delete',
        'form-edit',
        'form-read',
        'form-publish',
        'user-create',
        'user-delete',
        'user-edit'
      ])
    })

    it('should return a new array instance each time', () => {
      const result1 = getDefaultScopes()
      const result2 = getDefaultScopes()

      expect(result1).not.toBe(result2)
      expect(result1).toEqual(result2)
    })
  })
})
