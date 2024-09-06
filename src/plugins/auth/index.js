import Jwt from '@hapi/jwt'

import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/helpers/logging/logger.js'

const oidcJwksUri = config.get('oidcJwksUri')
const oidcVerifyAud = config.get('oidcVerifyAud')
const oidcVerifyIss = config.get('oidcVerifyIss')
const roleEditorGroupId = config.get('roleEditorGroupId')

const logger = createLogger()

/**
 * @satisfies {ServerRegisterPluginObject<void>}
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
        validate(artifacts) {
          const user = artifacts.decoded.payload

          if (!user) {
            logger.error('Authentication error: Missing user')
            return {
              isValid: false
            }
          }

          const { oid, groups = [] } = user

          if (!oid || typeof oid !== 'string') {
            logger.error(
              'Authentication error: user.oid is not a string or is missing'
            )
            return {
              isValid: false
            }
          }

          logger.debug(
            `User ${oid}: validating against groups: ${groups.length ? groups.join(', ') : '[]'}`
          )

          if (!groups.includes(roleEditorGroupId)) {
            logger.warn(
              `User ${oid}: failed authorisation. "${roleEditorGroupId}" not in groups`
            )
            return {
              isValid: false
            }
          }

          logger.debug(`User ${oid}: passed authorisation`)
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
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 * @import { Artifacts, UserProfile } from '~/src/plugins/auth/types.js'
 */
