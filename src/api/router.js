import { health } from '~/src/api/health'
import { forms } from '~/src/api/forms'

const router = {
  plugin: {
    name: 'Router',
    register: async (server) => {
      await server.register([health, forms])
    }
  }
}

export { router }
