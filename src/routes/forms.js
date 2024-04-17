import Boom from '@hapi/boom'

import { FailedToReadFormError } from '../api/forms/errors.js'

import {
  listForms,
  getForm,
  createForm,
  getFormDefinition
} from '~/src/api/forms/service.js'
import { createFormSchema, idParamSchema } from '~/src/models/forms.js'

/**
 * @type {ServerRoute[]}
 */
export default [
  {
    method: 'GET',
    path: '/forms',
    handler(request) {
      return listForms(request)
    }
  },
  {
    method: 'POST',
    path: '/forms',
    /**
     * @type {RouteFormCreation["handler"]}
     */
    async handler(request) {
      const { payload } = request

      const formConfiguration = await createForm(payload, request)

      return {
        id: formConfiguration._id,
        status: 'created'
      }
    },
    options: {
      validate: {
        payload: createFormSchema
      }
    }
  },
  {
    method: 'GET',
    path: '/forms/{id}',
    /**
     * @type {RouteFormById["handler"]}
     */
    async handler(request) {
      const { params } = request
      const { id } = params
      const form = await getForm(id, request)

      if (!form) {
        return Boom.notFound(`Form with id '${id}' not found`)
      }

      return form
    },
    options: {
      validate: {
        params: idParamSchema
      }
    }
  },
  {
    method: 'GET',
    path: '/forms/{id}/definition',
    /**
     * @type {RouteFormById["handler"]}
     */
    async handler(request) {
      const { params } = request
      const { id } = params

      try {
        const definition = await getFormDefinition(id)

        return definition
      } catch (err) {
        if (err instanceof FailedToReadFormError) {
          return Boom.notFound(err.message, err)
        }

        return new Boom.Boom(err)
      }
    },
    options: {
      validate: {
        params: idParamSchema
      }
    }
  }
]

/**
 * @typedef {import('@hapi/hapi').ServerRoute} ServerRoute
 * @typedef {import('../api/types.js').FormConfigurationInput} FormConfigurationInput
 * @typedef {import('@hapi/hapi').ServerRegisterPluginObject<void, void>} ServerRegisterPlugin
 * @typedef {import('@hapi/hapi').ServerRoute<{ Params: { id: string } }>} RouteFormById
 * @typedef {import('@hapi/hapi').ServerRoute<{ Payload: FormConfigurationInput }>} RouteFormCreation
 */
