import {
  ComponentType,
  SchemaVersion,
  formDefinitionSchema,
  formDefinitionV2Schema,
  hasComponentsEvenIfNoNext,
  paymentAmountSchema
} from '@defra/forms-model'
import Joi from 'joi'

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
 */
export function validate(definition, schema) {
  /** @type {{ error?: ValidationError; value: FormDefinition }} */
  const result = schema.validate(definition, {
    abortEarly: false
  })

  const { value } = result
  const error = result.error ?? postSchemaValidation(definition)

  if (error) {
    const name =
      !definition.name || definition.name === '' ? 'No name' : definition.name

    logger.warn(
      `Form failed validation: '${error.message}'. Form name: '${name}'`
    )

    throw new InvalidFormDefinitionError(error)
  }

  return value
}

/**
 * @param {string} fieldName
 * @param {string} message
 * @returns {Joi.ValidationError}
 */
export function createJoiError(fieldName, message) {
  return new Joi.ValidationError(
    message,
    [
      {
        message,
        path: [fieldName],
        type: 'custom'
      }
    ],
    {}
  )
}

/**
 * Global validation in addition to the Joi schema validation
 * @param {FormDefinition} definition
 * @returns { ValidationError | undefined }
 */
export function postSchemaValidation(definition) {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!definition.pages) {
    return undefined
  }
  // Look for pages where more than one payment component
  // Look for more than one payment component per form
  let paymentPages = 0
  for (const page of definition.pages) {
    const paymentComponents = hasComponentsEvenIfNoNext(page)
      ? page.components.filter(
          (comp) => comp.type === ComponentType.PaymentField
        )
      : []
    if (paymentComponents.length > 0) {
      paymentPages++
    }
    if (paymentComponents.length > 1) {
      return createJoiError(
        page.path,
        `More than one payment component on page ${page.path}`
      )
    }
    if (paymentComponents.length === 1) {
      const amountError = validatePaymentAmount(
        paymentComponents[0].options.amount
      )
      if (amountError) {
        return createJoiError(page.path, amountError)
      }
    }
  }
  return paymentPages > 1
    ? createJoiError('/', 'More than one payment page in form')
    : undefined
}

/**
 * Validates a payment amount against the GOV.UK Pay schema
 * @param {number} amount
 * @returns {string | undefined} error message if invalid, undefined if valid
 */
export function validatePaymentAmount(amount) {
  const { error } = paymentAmountSchema.validate(amount)
  return error?.message
}

/**
 * @import { FormDefinition } from '@defra/forms-model'
 * @import { ObjectSchema, ValidationError } from 'joi'
 */
