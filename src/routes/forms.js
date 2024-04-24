import Boom from '@hapi/boom'

import { FailedToReadFormError } from '../api/forms/errors.js'

import {
  listForms,
  getForm,
  createForm,
  getFormDefinition
} from '~/src/api/forms/service.js'
import { createFormSchema, formByIdSchema } from '~/src/models/forms.js'

/**
 * @type {ServerRoute[]}
 */
export default [
  {
    method: 'GET',
    path: '/forms',
    handler() {
      return listForms()
    }
  },
  {
    method: 'POST',
    path: '/forms',
    /**
     * @param {RequestCreateForm} request
     */
    async handler(request) {
      const { payload } = request

      const formConfiguration = await createForm(payload)

      return {
        id: formConfiguration.id,
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
     * @param {RequestFormById} request
     */
    async handler(request) {
      const { params } = request
      const { id } = params
      const form = await getForm(id)

      if (!form) {
        return Boom.notFound(`Form with id '${id}' not found`)
      }

      return form
    },
    options: {
      validate: {
        params: formByIdSchema
      }
    }
  },
  {
    method: 'GET',
    path: '/forms/{id}/definition',
    /**
     * @param {RequestFormById} request
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

        throw err
      }
    },
    options: {
      validate: {
        params: formByIdSchema
      }
    }
  }
]

/**
 * @typedef {import('@hapi/hapi').ServerRoute} ServerRoute
 * @typedef {import('../api/types.js').RequestCreateForm} RequestCreateForm
 * @typedef {import('../api/types.js').RequestFormById} RequestFormById
 */
