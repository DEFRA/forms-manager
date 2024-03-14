import { healthController } from '~/src/api/health/controller.js'

/**
 * @satisfies {ServerRegisterPlugin}
 */
export const health = {
  plugin: {
    name: 'health',
    register(server) {
      server.route({
        method: 'GET',
        path: '/health',
        ...healthController
      })
    }
  }
}

/**
 * @typedef {import('@hapi/hapi').ServerRegisterPluginObject<void, void>} ServerRegisterPlugin
 */
