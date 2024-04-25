import { formDefinitionSchema, formMetadataSchema } from '@defra/forms-model'
import Boom from '@hapi/boom'

import { FailedToReadFormError } from '../api/forms/errors.js'

import {
  listForms,
  getForm,
  createForm,
  updateDraftFormDefinition,
  getDraftFormDefinition
} from '~/src/api/forms/service.js'
import { formByIdSchema } from '~/src/models/forms.js'

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
     * @param {RequestFormMetadata} request
     */
    async handler(request) {
      const { payload } = request

      const formMetadata = await createForm(payload)

      return {
        id: formMetadata.id,
        status: 'created'
      }
    },
    options: {
      validate: {
        payload: formMetadataSchema
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
    path: '/forms/{id}/definition/draft',
    /**
     * @param {RequestFormById} request
     */
    async handler(request) {
      const { params } = request
      const { id } = params

      try {
        const definition = await getDraftFormDefinition(id)

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
  },
  {
    method: 'POST',
    path: '/forms/{id}/definition/draft',
    /**
     * @param {RequestFormDefinition} request
     */
    async handler(request) {
      const { params, payload } = request

      await updateDraftFormDefinition(params.id, payload)

      return {
        id: params.id,
        status: 'updated'
      }
    },
    options: {
      validate: {
        payload: formDefinitionSchema
      }
    }
  }
]

/**
 * @typedef {import('@hapi/hapi').ServerRoute} ServerRoute
 * @typedef {import('~/src/api/types.js').RequestFormById} RequestFormById
 * @typedef {import('~/src/api/types.js').RequestFormDefinition} RequestFormDefinition
 * @typedef {import('~/src/api/types.js').RequestFormMetadata} RequestFormMetadata
 */
