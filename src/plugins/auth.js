import Jwt from '@hapi/jwt'

import { config } from '../config/index.js'

import { createLogger } from '~/src/helpers/logging/logger.js'

const oidcJwksUri = config.get('oidcJwksUri')
const oidcVerifyAud = config.get('oidcVerifyAud')
const oidcVerifyIss = config.get('oidcVerifyIss')
const roleEditorGroupId = config.get('roleEditorGroupId')

const logger = createLogger()

/**
 * @satisfies {ServerRegisterPlugin}
 */
export const auth = {
  plugin: {
    name: 'auth',
    async register(server) {
      await server.register(Jwt)

      server.auth.strategy('azure-oidc-token', 'jwt', {
        keys: {
          uri: oidcJwksUri
        },
        verify: {
          aud: oidcVerifyAud,
          iss: oidcVerifyIss,
          sub: false,
          nbf: true,
          exp: true
        },
        /**
         * @param {Artifacts<UserProfile>} artifacts
         */
        validate: (artifacts) => {
          const user = artifacts.decoded.payload
          const groups = Array.isArray(user?.groups) ? user.groups : []
          logger.debug(`Validating user against groups: ${groups.join(', ')}`)

          if (!groups.includes(roleEditorGroupId)) {
            logger.debug('User failed authorisation')
            return {
              isValid: false
            }
          }

          logger.debug('User passed authorisation')
          return {
            isValid: true,
            credentials: { user }
          }
        }
      })

      // Set as the default strategy
      server.auth.default('azure-oidc-token')
    }
  }
}

/**
 * @typedef {import('@hapi/hapi').ServerRegisterPluginObject<void, void>} ServerRegisterPlugin
 * @typedef {import('oidc-client-ts').UserProfile & { groups?: string[] }} UserProfile
 */
/**
 * @template {object} Payload
 * @typedef {import('@hapi/jwt').HapiJwt.Artifacts<{ JwtPayload?: Payload }>} Artifacts
 */