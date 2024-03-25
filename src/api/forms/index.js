import {
  listForms,
  getForm,
  createForm,
  getFormDefinition
} from '~/src/api/forms/service.js'

/**
 * @satisfies {ServerRegisterPlugin}
 */
export const forms = {
  plugin: {
    name: 'forms',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/forms',
          handler() {
            return listForms()
          }
        },
        {
          method: 'GET',
          path: '/forms/{id}',
          /**
           * @type {RouteFormById["handler"]}
           */
          async handler(request) {
            return getForm(request.params.id)
          }
        },
        {
          method: 'POST',
          path: '/forms',
          /**
           * @type {RouteFormCreation["handler"]}
           */
          handler: async (request) => {
            const formConfiguration = await createForm(request.payload)

            return {
              id: formConfiguration.id,
              status: 'created'
            }
          }
        },
        {
          method: 'GET',
          path: '/forms/{id}/definition',
          /**
           * @type {RouteFormById["handler"]}
           */
          handler: async (request) => {
            return getFormDefinition(request.params.id)
          }
        }
      ])
    }
  }
}

/**
 * @typedef {import('@hapi/hapi').ServerRegisterPluginObject<void, void>} ServerRegisterPlugin
 * @typedef {import('../types.js').FormConfigurationInput} FormConfigurationInput
 * @typedef {import('@hapi/hapi').ServerRoute<{ Params: { id: string } }>} RouteFormById
 * @typedef {import('@hapi/hapi').ServerRoute<{ Payload: FormConfigurationInput }>} RouteFormCreation
 */
