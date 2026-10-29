import {
  ComponentType,
  ControllerType,
  SchemaVersion,
  formDefinitionSchema,
  formDefinitionV2Schema,
  hasComponentsEvenIfNoNext,
  paymentAmountSchema
} from '@defra/forms-model'
import Joi from 'joi'

import { InvalidFormDefinitionError } from '~/src/api/forms/errors.js'
import { logger } from '~/src/helpers/logging/logger.js'

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
 * Returns the options held in the form definition metadata, or an empty
 * object if there are none
 * @param {FormDefinition} definition
 * @returns {Record<string, unknown>}
 */
export function getMetadataOptions(definition) {
  const options = definition.metadata?.options

  if (
    typeof options === 'object' &&
    options !== null &&
    !Array.isArray(options)
  ) {
    return /** @type {Record<string, unknown>} */ (options)
  }

  return {}
}

/**
 * Checks whether the form allows answers to be copied from a previous
 * submission, as set by the metadata.options.allowCopy flag
 * @param {FormDefinition} definition
 * @returns {boolean}
 */
export function isAllowCopyEnabled(definition) {
  return getMetadataOptions(definition).allowCopy === true
}

/**
 * Global validation in addition to the Joi schema validation
 * @param {FormDefinition} definition
 * @returns { ValidationError | undefined }
 */
export function postSchemaValidation(definition) {
  // forms-model does not define metadata.options.allowCopy, so check its type here
  const { allowCopy } = getMetadataOptions(definition)

  if (allowCopy !== undefined && typeof allowCopy !== 'boolean') {
    return createJoiError('/', '"metadata.options.allowCopy" must be a boolean')
  }

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
  if (paymentPages > 1) {
    return createJoiError('/', 'More than one payment page in form')
  }

  // Check if there is an incompatibility between reference number and payment
  if (paymentPages === 1) {
    if (!definition.options?.showReferenceNumber) {
      return createJoiError(
        '/',
        'Reference number must be enabled if the form has a payment question'
      )
    }
  }

  // Copying answers from a previous submission relies on the reference number
  // and the confirmation email
  if (isAllowCopyEnabled(definition)) {
    if (!definition.options?.showReferenceNumber) {
      return createJoiError(
        '/',
        'Reference number must be enabled if the form allows answers to be reused from a previous submission'
      )
    }

    if (
      definition.pages.some(
        (page) => page.controller === ControllerType.Summary
      )
    ) {
      return createJoiError(
        '/',
        'Confirmation email must be enabled if the form allows answers to be reused from a previous submission'
      )
    }
  }

  return undefined
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
