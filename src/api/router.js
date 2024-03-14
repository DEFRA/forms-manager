import { forms } from '~/src/api/forms/index.js'
import { health } from '~/src/api/health/index.js'

/**
 * @satisfies {ServerRegisterPlugin}
 */
export const router = {
  plugin: {
    name: 'Router',
    async register(server) {
      await server.register([health, forms])
    }
  }
}

/**
 * @typedef {import('@hapi/hapi').ServerRegisterPluginObject<void, void>} ServerRegisterPlugin
 */
