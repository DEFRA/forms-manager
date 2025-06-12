import {
  SchemaVersion,
  formDefinitionSchema,
  formDefinitionV2Schema
} from '@defra/forms-model'

import { InvalidFormDefinitionError } from '~/src/api/forms/errors.js'
import { logger } from '~/src/api/forms/service/shared.js'

/**
 * Determines the correct validation schema based on the form definition's schema property
 * @param {FormDefinition} definition
 * @returns {ObjectSchema<FormDefinition>}
 */
export function getValidationSchema(definition) {
  const { schema } = definition

  // If schema is explicitly V2, use V2 validation
  if (schema === SchemaVersion.V2) {
    return formDefinitionV2Schema
  }

  // Default to V1 validation (for schema V1 or undefined)
  return formDefinitionSchema
}

/**
 * Validates the form definition
 * @param {FormDefinition} definition
 * @param {ObjectSchema<FormDefinition>} schema
 * @param {boolean} [allowFailure] - If true, does not throw on validation failure
 */
export function validate(definition, schema, allowFailure = false) {
  /** @type {{ error?: ValidationError; value: FormDefinition }} */
  const result = schema.validate(definition)

  const { error } = result

  if (error && !allowFailure) {
    const name = definition.name ?? 'No name'

    logger.warn(
      `Form failed validation: '${error.message}'. Form name: '${name}'`
    )

    throw new InvalidFormDefinitionError(name, {
      cause: error
    })
  }

  return result
}

/**
 * @import { FormDefinition } from '@defra/forms-model'
 * @import { ObjectSchema, ValidationError } from 'joi'
 */
