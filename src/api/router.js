import { forms } from '~/src/api/forms/index.js'
import { health } from '~/src/api/health/index.js'

export const router = {
  plugin: {
    name: 'Router',
    register: async (server) => {
      await server.register([health, forms])
    }
  }
}
