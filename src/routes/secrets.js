import { Scopes, idSchema, nameSchema } from '@defra/forms-model'
import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'

import {
  existsFormSecret,
  getFormSecret,
  saveFormSecret
} from '~/src/api/forms/service/secrets.js'
import { failAction } from '~/src/helpers/fail-action.js'
import { getAuthor } from '~/src/helpers/get-author.js'

const ROUTE_SECRETS = '/forms/{id}/secrets/{name}'
const ROUTE_SECRET_EXISTS = '/forms/{id}/secrets/{name}/exists'

// Schema to retrieve form secret by form id and secret name
export const formSecretSchema = Joi.object()
  .keys({
    id: idSchema,
    name: nameSchema
  })
  .required()

export const formSecretPayloadSchema = Joi.object()
  .keys({
    secretValue: Joi.string().trim().required()
  })
  .required()

/**
 * @type {ServerRoute[]}
 */
export default [
  {
    method: 'GET',
    path: ROUTE_SECRETS,
    /**
     * @param {RequestGetFormSecret} request
     */
    handler(request) {
      const { params } = request
      const { id, name } = params

      return getFormSecret(id, name)
    },
    options: {
      auth: false,
      validate: {
        params: formSecretSchema
      }
    }
  },
  {
    method: 'GET',
    path: ROUTE_SECRET_EXISTS,
    /**
     * @param {RequestGetFormSecret} request
     */
    handler(request) {
      const { params } = request
      const { id, name } = params

      return existsFormSecret(id, name)
    },
    options: {
      auth: false,
      validate: {
        params: formSecretSchema
      }
    }
  },
  {
    method: 'POST',
    path: ROUTE_SECRETS,
    /**
     * @param {RequestSaveFormSecret} request
     */
    async handler(request) {
      const { auth, params, payload } = request
      const { id, name } = params
      const author = getAuthor(auth.credentials.user)

      await saveFormSecret(id, name, payload.secretValue, author)

      return StatusCodes.OK
    },
    options: {
      auth: {
        scope: [`+${Scopes.FormEdit}`]
      },
      validate: {
        params: formSecretSchema,
        payload: formSecretPayloadSchema,
        failAction
      }
    }
  }
]

/**
 * @import { ServerRoute } from '@hapi/hapi'
 * @import { RequestGetFormSecret, RequestSaveFormSecret } from '~/src/api/types.js'
 */
