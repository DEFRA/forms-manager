import Jwt from '@hapi/jwt'

import { config } from '../config/index.js'

/**
 * @satisfies {ServerRegisterPlugin}
 */
export const auth = {
  plugin: {
    name: 'auth',
    async register(server) {
      await server.register(Jwt)

      server.auth.strategy('jwt_token', 'jwt', {
        keys: {
          uri: config.get('oidcJwksUri')
        },
        verify: {
          aud: config.get('oidcVerifyAud'),
          iss: config.get('oidcVerifyIss'),
          sub: false,
          nbf: true,
          exp: true
        },
        /**
         * @param {Artifacts} artifacts
         */
        validate: (artifacts) => {
          return {
            isValid: true,
            credentials: { user: artifacts.decoded.payload }
          }
        }
      })

      // Set as the default strategy
      server.auth.default('jwt_token')
    }
  }
}

/**
 * @typedef {import('@hapi/hapi').ServerRegisterPluginObject<void, void>} ServerRegisterPlugin
 * @typedef {import('@hapi/jwt').HapiJwt.Artifacts} Artifacts
 */
