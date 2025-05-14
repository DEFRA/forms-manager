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
         * @param {Artifacts<UserCredentials>} artifacts
         */
        validate(artifacts) {
          const user = artifacts.decoded.payload

          if (!user) {
            logger.error('Auth: Missing user from token payload.')
            return {
              isValid: false
            }
          }

          const { oid } = user
          const groupsClaim = user.groups

          if (!oid) {
            logger.error('Auth: User OID is missing in token payload.')
            return {
              isValid: false
            }
          }

          let processedGroups = []

          // For the integration tests, the OIDC mock server sends the 'groups' claim as a stringified JSON array which
          // requires parsing, while a real Azure AD would typically provide 'groups' as a proper array.
          // We handle both formats for flexibility between test and production environments.
          if (typeof groupsClaim === 'string') {
            try {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- we know this is a stringified JSON array
              const parsed = JSON.parse(groupsClaim)

              if (Array.isArray(parsed)) {
                processedGroups = parsed
              } else {
                logger.warn(
                  `Auth: User ${oid}: 'groups' claim was string but not valid JSON array: '${String(groupsClaim)}'. Defaulting to no groups.`
                )
              }
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : 'Unknown parsing error'
              logger.error(
                `Auth: User ${oid}: Failed to parse 'groups' claim string as JSON: '${String(groupsClaim)}'. Error: ${errorMessage}. Defaulting to no groups.`
              )
            }
          } else if (Array.isArray(groupsClaim)) {
            processedGroups = groupsClaim
          }

          logger.debug(
            `Auth: User ${oid}: Validating with processed groups: [${processedGroups.join(', ')}]`
          )

          if (!processedGroups.includes(roleEditorGroupId)) {
            logger.warn(
              `Auth: User ${oid}: Authorisation failed. Editor group ID "${roleEditorGroupId}" not found in token groups: [${processedGroups.join(', ')}]`
            )
            return {
              isValid: false
            }
          }

          logger.debug(`User ${oid}: passed authorisation`)
          return {
            isValid: true,
            credentials: {
              user: {
                ...user,
                groups: processedGroups
              }
            }
          }
        }
      })

      // Set as the default strategy
      server.auth.default('azure-oidc-token')
    }
  }
}

/**
 * @import { ServerRegisterPluginObject, UserCredentials } from '@hapi/hapi'
 * @import { Artifacts } from '~/src/plugins/auth/types.js'
 */
