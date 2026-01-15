const mockActualTestErrorFn = jest.fn()
const mockActualTestWarnFn = jest.fn()
const mockActualTestInfoFn = jest.fn()

jest.mock('~/src/helpers/logging/logger.js', () => ({
  createLogger: jest.fn().mockReturnValue({
    error: mockActualTestErrorFn,
    warn: mockActualTestWarnFn,
    info: mockActualTestInfoFn
  })
}))

jest.mock('~/src/config/index.js', () => ({
  config: {
    get: jest.fn((key) => {
      if (key === 'oidcJwksUri') return 'mock-jwks-uri'
      if (key === 'oidcVerifyAud') return 'mock-aud'
      if (key === 'oidcVerifyIss') return 'mock-iss'
      return 'mock-value'
    })
  }
}))

jest.mock('~/src/api/entitlements/service.js', () => ({
  getUserScopes: jest.fn(() =>
    Promise.resolve(['form-delete', 'form-edit', 'form-read'])
  )
}))

jest.mock('@hapi/jwt')

describe('auth plugin', () => {
  /** @type {AuthModule} */
  let authModule
  /** @type {Auth} */
  let auth
  /** @type {ValidateFn} */
  let validateFn
  /** @type {Jwt} */
  let Jwt

  const server = {
    register: jest.fn().mockResolvedValue(undefined),
    auth: {
      strategy: jest.fn(),
      default: jest.fn()
    }
  }

  beforeEach(async () => {
    jest.resetModules()
    jest.clearAllMocks()

    const jwtModule = await import('@hapi/jwt')
    Jwt = /** @type {Jwt} */ (jwtModule.default)

    authModule = await import('~/src/plugins/auth/index.js')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    auth = authModule.auth
  })

  test('should register the JWT plugin', async () => {
    await auth.plugin.register(/** @type {any} */ (server))
    expect(server.register).toHaveBeenCalledWith(Jwt)
  })

  test('should set up the auth strategy', async () => {
    await auth.plugin.register(/** @type {any} */ (server))
    expect(server.auth.strategy).toHaveBeenCalledWith(
      'azure-oidc-token',
      'jwt',
      expect.objectContaining({
        keys: expect.any(Object),
        verify: expect.any(Object),
        validate: expect.any(Function)
      })
    )
  })

  test('should set the default auth strategy', async () => {
    await auth.plugin.register(/** @type {any} */ (server))
    expect(server.auth.default).toHaveBeenCalledWith('azure-oidc-token')
  })

  describe('validate function', () => {
    beforeEach(async () => {
      await auth.plugin.register(/** @type {any} */ (server))
      if (server.auth.strategy.mock.calls.length > 0) {
        const strategyOptions = /** @type {{ validate: ValidateFn }} */ (
          server.auth.strategy.mock.calls[
            server.auth.strategy.mock.calls.length - 1
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          ][2]
        )
        validateFn = strategyOptions.validate
      } else {
        validateFn = () => Promise.resolve({ isValid: false })
      }
    })

    test('should return isValid: false when user is missing from payload', async () => {
      const artifacts = /** @type {any} */ ({
        decoded: {
          payload: null
        }
      })
      const result = await validateFn(artifacts)
      expect(result).toEqual({ isValid: false })
      expect(mockActualTestInfoFn).toHaveBeenCalledWith(
        '[authMissingUser] Auth: Missing user from token payload.'
      )
    })

    test('should return isValid: false when oid is missing', async () => {
      const artifacts = /** @type {any} */ ({
        decoded: {
          payload: {}
        }
      })
      const result = await validateFn(artifacts)
      expect(result).toEqual({ isValid: false })
      expect(mockActualTestInfoFn).toHaveBeenCalledWith(
        '[authMissingOID] Auth: User OID is missing in token payload.'
      )
    })

    test('should fetch user scopes from API with auth token', async () => {
      const artifacts = /** @type {any} */ ({
        decoded: {
          payload: {
            oid: 'test-oid'
          }
        },
        token: 'test-jwt-token'
      })
      const result = await validateFn(artifacts)

      expect(result).toEqual({
        isValid: true,
        credentials: {
          user: {
            oid: 'test-oid'
          },
          scope: ['form-delete', 'form-edit', 'form-read']
        }
      })
    })

    test('should handle missing auth token', async () => {
      const artifacts = /** @type {any} */ ({
        decoded: {
          payload: {
            oid: 'test-oid'
          }
        }
      })
      const result = await validateFn(artifacts)

      expect(result).toEqual({
        isValid: true,
        credentials: {
          user: {
            oid: 'test-oid'
          },
          scope: ['form-delete', 'form-edit', 'form-read']
        }
      })
    })
  })

  describe('getUserScopes error handling', () => {
    beforeEach(async () => {
      jest.clearAllMocks()
      await auth.plugin.register(/** @type {any} */ (server))
      if (server.auth.strategy.mock.calls.length > 0) {
        const strategyOptions = /** @type {{ validate: ValidateFn }} */ (
          server.auth.strategy.mock.calls[
            server.auth.strategy.mock.calls.length - 1
          ][2]
        )
        validateFn = strategyOptions.validate
      } else {
        validateFn = () => Promise.resolve({ isValid: false })
      }
    })

    test('should handle empty scopes from getUserScopes', async () => {
      const { getUserScopes } = await import(
        '~/src/api/entitlements/service.js'
      )
      getUserScopes.mockResolvedValueOnce([])

      const artifacts = /** @type {any} */ ({
        decoded: {
          payload: {
            oid: 'test-oid'
          }
        },
        token: 'test-jwt-token'
      })

      const result = await validateFn(artifacts)

      expect(getUserScopes).toHaveBeenCalledWith('test-oid', 'test-jwt-token')
      expect(result).toEqual({
        isValid: true,
        credentials: {
          user: {
            oid: 'test-oid'
          },
          scope: []
        }
      })
    })

    test('should handle getUserScopes rejection', async () => {
      const { getUserScopes } = await import(
        '~/src/api/entitlements/service.js'
      )
      getUserScopes.mockRejectedValueOnce(new Error('API Error'))

      const artifacts = /** @type {any} */ ({
        decoded: {
          payload: {
            oid: 'test-oid'
          }
        },
        token: 'test-jwt-token'
      })

      await expect(validateFn(artifacts)).rejects.toThrow('API Error')
      expect(getUserScopes).toHaveBeenCalledWith('test-oid', 'test-jwt-token')
    })
  })
})

/**
 * @typedef {typeof AuthModuleDefinitionStar} AuthModule
 */
/**
 * @typedef {AuthTypeDefinition} Auth
 */
/**
 * @typedef {(artifacts: Artifacts<UserCredentials>) => Promise<{ isValid: boolean, credentials?: any }>} ValidateFn
 */
/**
 * @typedef {jest.Mocked<JwtTypeDefinition>} Jwt
 */

/**
 * @import { UserCredentials } from '@hapi/hapi'
 * @import { Artifacts } from '~/src/plugins/auth/types.js'
 * @import * as AuthModuleDefinitionStar from '~/src/plugins/auth/index.js'
 * @import { auth as AuthTypeDefinition } from '~/src/plugins/auth/index.js'
 * @import { default as JwtTypeDefinition } from '@hapi/jwt'
 */
