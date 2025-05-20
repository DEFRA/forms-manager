import { InvalidFormDefinitionError } from '~/src/api/forms/errors.js'
import { logger } from '~/src/api/forms/service/shared.js'

/**
 * Validates the form definition
 * @param {FormDefinition} definition
 * @param {ObjectSchema<FormDefinition>} schema
 */
export function validate(definition, schema) {
  /** @type {{ error?: ValidationError; value: FormDefinition }} */
  const result = schema.validate(definition)

  const { error, value } = result

  if (error) {
    const name = definition.name ?? 'No name'

    logger.warn(
      `Form failed validation: '${error.message}'. Form name: '${name}'`
    )

    throw new InvalidFormDefinitionError(name, {
      cause: error
    })
  }

  return value
}

/**
 * @import { FormDefinition } from '@defra/forms-model'
 * @import { ObjectSchema, ValidationError } from 'joi'
 */
