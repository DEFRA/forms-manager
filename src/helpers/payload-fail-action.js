import Boom from '@hapi/boom'
import Joi from 'joi'

import { InvalidFormDefinitionError } from '~/src/api/forms/errors.js'

/**
 * Fail action factory to match invalid payloads to InvalidFormDefinitionError
 * @param {ErrorMatchPath} [errorPathPrefix] - the error path prefix to use for non-root errors
 */
export const failAction = (errorPathPrefix) => {
  /**
   * @type {Lifecycle.Method}
   */
  return (_request, _h, err) => {
    if (Boom.isBoom(err) && Joi.isError(err)) {
      /** @type {{ source?: string } | undefined} */
      // @ts-expect-error - unknown type
      const validation = err.output.payload.validation
      const source = validation?.source ?? ''
      if (source === 'payload') {
        throw new InvalidFormDefinitionError(err, errorPathPrefix)
      }
    }

    return err ?? new Error('Unknown error')
  }
}

/**
 * @import { Lifecycle } from '@hapi/hapi'
 * @import { ErrorMatchPath } from '@defra/forms-model'
 */
