import { listForms } from '~/src/api/forms/service'

const forms = {
  plugin: {
    name: 'forms',
    register: async (server) => {
      server.route([
        {
          method: 'GET',
          path: '/forms',
          handler: async (request, h) => {
            return listForms()
          }
        }
      ])
    }
  }
}

export { forms }
