import { health } from '~/src/api/health'
import { example } from '~/src/api/example'
import { forms } from '~/src/api/forms'

const router = {
  plugin: {
    name: 'Router',
    register: async (server) => {
      await server.register([health, example, forms])
    }
  }
}

export { router }
