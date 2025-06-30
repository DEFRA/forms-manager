import Boom from '@hapi/boom'
import Joi from 'joi'

import { InvalidFormDefinitionError } from '~/src/api/forms/errors.js'
import { getErrorMessage } from '~/src/helpers/error-message.js'
import { createLogger } from '~/src/helpers/logging/logger.js'

const logger = createLogger()

/**
 * @type {Lifecycle.Method}
 */
export const failAction = (_request, _h, err) => {
  logger.error(
    `[validationFailed] Request validation failed - ${getErrorMessage(err)}`
  )

  if (Boom.isBoom(err) && Joi.isError(err)) {
    /** @type {{ source?: string } | undefined} */
    // @ts-expect-error - unknown type
    const validation = err.output.payload.validation

    if (validation?.source === 'payload') {
      throw new InvalidFormDefinitionError(err)
    }
  }

  return err ?? new Error('Unknown error')
}

/**
 * @import { Lifecycle } from '@hapi/hapi'
 */
