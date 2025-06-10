import {
  Engine,
  SchemaVersion,
  formDefinitionSchema,
  formDefinitionV2Schema
} from '@defra/forms-model'

import { InvalidFormDefinitionError } from '~/src/api/forms/errors.js'
import { logger } from '~/src/api/forms/service/shared.js'

/**
 * Determines the correct validation schema based on the form definition
 * @param {FormDefinition} definition
 * @returns {ObjectSchema<FormDefinition>}
 */
export function getValidationSchema(definition) {
  return definition.engine === Engine.V2 ||
    definition.schema === SchemaVersion.V2
    ? formDefinitionV2Schema
    : formDefinitionSchema
}

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
