import {
  ComponentType,
  SchemaVersion,
  formDefinitionSchema,
  formDefinitionV2Schema
} from '@defra/forms-model'
import Joi from 'joi'

import {
  buildDefinition,
  buildPaymentPage,
  buildQuestionPage,
  buildSummaryPage,
  buildSummaryPageWithConfirmation,
  buildTextFieldComponent
} from '~/src/api/forms/__stubs__/definition.js'
import { InvalidFormDefinitionError } from '~/src/api/forms/errors.js'
import {
  getMetadataOptions,
  getValidationSchema,
  isAllowCopyEnabled,
  postSchemaValidation,
  validate,
  validatePaymentAmount
} from '~/src/api/forms/service/helpers/definition.js'

jest.mock('~/src/helpers/logging/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}))

describe('definition helpers', () => {
  describe('getValidationSchema', () => {
    it('should return V1 schema when schema is V1', () => {
      const definition = buildDefinition({ schema: SchemaVersion.V1 })
      const result = getValidationSchema(definition)
      expect(result).toBe(formDefinitionSchema)
    })

    it('should return V2 schema when schema is V2', () => {
      const definition = buildDefinition({ schema: SchemaVersion.V2 })
      const result = getValidationSchema(definition)
      expect(result).toBe(formDefinitionV2Schema)
    })

    it('should return V1 schema by default when no schema specified', () => {
      const definition = buildDefinition({})
      const result = getValidationSchema(definition)
      expect(result).toBe(formDefinitionSchema)
    })

    it('should return V1 schema when schema is undefined', () => {
      const definition = buildDefinition({ schema: undefined })
      const result = getValidationSchema(definition)
      expect(result).toBe(formDefinitionSchema)
    })
  })

  describe('validate', () => {
    const mockSchema = {
      validate: jest.fn()
    }

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should return validated value when validation succeeds', () => {
      /** @type {any} */
      const definition = { name: 'Test Form' }
      const expectedValue = { name: 'Test Form', validated: true }

      mockSchema.validate.mockReturnValue({
        error: undefined,
        value: expectedValue
      })

      const result = validate(definition, /** @type {any} */ (mockSchema))

      expect(mockSchema.validate).toHaveBeenCalledWith(definition, {
        abortEarly: false
      })
      expect(result).toBe(expectedValue)
    })

    it('should throw InvalidFormDefinitionError when validation fails', () => {
      /** @type {any} */
      const definition = { name: 'Test Form' }
      const validationError = new Joi.ValidationError(
        'Validation failed',
        [],
        {}
      )

      mockSchema.validate.mockReturnValue({
        error: validationError,
        value: undefined
      })

      expect(() =>
        validate(definition, /** @type {any} */ (mockSchema))
      ).toThrow(InvalidFormDefinitionError)
      expect(mockSchema.validate).toHaveBeenCalledWith(definition, {
        abortEarly: false
      })
    })
  })

  describe('getMetadataOptions', () => {
    it('should return the metadata options', () => {
      const definition = buildDefinition({
        metadata: { options: { allowCopy: true, other: 'value' } }
      })
      expect(getMetadataOptions(definition)).toEqual({
        allowCopy: true,
        other: 'value'
      })
    })

    it.each([
      { desc: 'there is no metadata', metadata: undefined },
      { desc: 'there are no metadata options', metadata: {} },
      { desc: 'the metadata options are null', metadata: { options: null } },
      { desc: 'the metadata options are a string', metadata: { options: 'x' } },
      { desc: 'the metadata options are an array', metadata: { options: [] } }
    ])('should return an empty object if $desc', ({ metadata }) => {
      const definition = buildDefinition({ metadata })
      expect(getMetadataOptions(definition)).toEqual({})
    })
  })

  describe('isAllowCopyEnabled', () => {
    it('should return true if metadata.options.allowCopy is true', () => {
      const definition = buildDefinition({
        metadata: { options: { allowCopy: true } }
      })
      expect(isAllowCopyEnabled(definition)).toBe(true)
    })

    it.each([
      { desc: 'there is no metadata', metadata: undefined },
      { desc: 'there are no metadata options', metadata: {} },
      { desc: 'allowCopy is not set', metadata: { options: {} } },
      {
        desc: 'allowCopy is false',
        metadata: { options: { allowCopy: false } }
      },
      {
        desc: 'allowCopy is not a boolean',
        metadata: { options: { allowCopy: 'true' } }
      }
    ])('should return false if $desc', ({ metadata }) => {
      const definition = buildDefinition({ metadata })
      expect(isAllowCopyEnabled(definition)).toBe(false)
    })
  })

  describe('postSchemaValidation', () => {
    it('should return undefined if no pages', () => {
      // @ts-expect-error - missing pages from definition
      expect(postSchemaValidation({})).toBeUndefined()
    })

    it('should return undefined if no payment pages', () => {
      const definition = buildDefinition({
        pages: [buildQuestionPage(buildTextFieldComponent())]
      })
      expect(postSchemaValidation(definition)).toBeUndefined()
    })

    it('should return error if more than one payment component on a page', () => {
      const paymentPage = buildPaymentPage()
      paymentPage.components.push({
        type: ComponentType.PaymentField,
        title: 'Payment required2',
        name: 'paymentField2',
        options: {
          required: true,
          amount: 200,
          description: 'Payment desc2'
        }
      })
      const definition = buildDefinition({
        pages: [paymentPage]
      })
      const res = postSchemaValidation(definition)
      expect(res).toBeInstanceOf(Joi.ValidationError)
      expect(res?.message).toBe(
        'More than one payment component on page /payment-required'
      )
    })

    it('should return error if more than one payment page in form', () => {
      const paymentPage = buildPaymentPage()
      const definition = buildDefinition({
        pages: [paymentPage, paymentPage]
      })
      const res = postSchemaValidation(definition)
      expect(res).toBeInstanceOf(Joi.ValidationError)
      expect(res?.message).toBe('More than one payment page in form')
    })

    it('should return error if payment amount is invalid', () => {
      const paymentPage = buildPaymentPage({
        components: [
          {
            type: ComponentType.PaymentField,
            title: 'Payment required',
            name: 'paymentField',
            options: {
              required: true,
              amount: -10,
              description: 'Payment desc'
            }
          }
        ]
      })
      const definition = buildDefinition({ pages: [paymentPage] })
      const res = postSchemaValidation(definition)
      expect(res).toBeInstanceOf(Joi.ValidationError)
      expect(res?.message).toBe('"value" must be greater than or equal to 0')
    })

    it('should return error if payment enabled but ref num disabled', () => {
      const paymentPage = buildPaymentPage({
        components: [
          {
            type: ComponentType.PaymentField,
            title: 'Payment required',
            name: 'paymentField',
            options: {
              required: true,
              amount: 10,
              description: 'Payment desc'
            }
          }
        ]
      })
      const definition = buildDefinition({ pages: [paymentPage] })
      const res = postSchemaValidation(definition)
      expect(res).toBeInstanceOf(Joi.ValidationError)
      expect(res?.message).toBe(
        'Reference number must be enabled if the form has a payment question'
      )
    })

    it.each([
      { desc: 'a string', allowCopy: 'true' },
      { desc: 'a number', allowCopy: 1 },
      { desc: 'null', allowCopy: null },
      { desc: 'an object', allowCopy: {} }
    ])('should return error if allowCopy is $desc', ({ allowCopy }) => {
      const definition = buildDefinition({
        pages: [buildSummaryPageWithConfirmation()],
        options: { showReferenceNumber: true },
        metadata: { options: { allowCopy } }
      })
      const res = postSchemaValidation(definition)
      expect(res).toBeInstanceOf(Joi.ValidationError)
      expect(res?.message).toBe(
        '"metadata.options.allowCopy" must be a boolean'
      )
    })

    it('should return undefined if allowCopy is not provided', () => {
      const definition = buildDefinition({
        pages: [buildSummaryPage()],
        metadata: { options: {} }
      })
      expect(postSchemaValidation(definition)).toBeUndefined()
    })

    it('should return error if allowCopy is enabled but the reference number is disabled', () => {
      const definition = buildDefinition({
        pages: [buildSummaryPageWithConfirmation()],
        options: { showReferenceNumber: false },
        metadata: { options: { allowCopy: true } }
      })
      const res = postSchemaValidation(definition)
      expect(res).toBeInstanceOf(Joi.ValidationError)
      expect(res?.message).toBe(
        'Reference number must be enabled if the form allows answers to be reused from a previous submission'
      )
    })

    it('should return error if allowCopy is enabled but the confirmation email is disabled', () => {
      const definition = buildDefinition({
        pages: [buildSummaryPage()],
        options: { showReferenceNumber: true },
        metadata: { options: { allowCopy: true } }
      })
      const res = postSchemaValidation(definition)
      expect(res).toBeInstanceOf(Joi.ValidationError)
      expect(res?.message).toBe(
        'Confirmation email must be enabled if the form allows answers to be reused from a previous submission'
      )
    })

    it.each([
      {
        desc: 'allowCopy is enabled and the reference number and confirmation email are enabled',
        page: buildSummaryPageWithConfirmation(),
        showReferenceNumber: true,
        allowCopy: true
      },
      {
        desc: 'allowCopy is disabled and the reference number and confirmation email are disabled',
        page: buildSummaryPage(),
        showReferenceNumber: false,
        allowCopy: false
      }
    ])(
      'should return undefined if $desc',
      ({ page, showReferenceNumber, allowCopy }) => {
        const definition = buildDefinition({
          pages: [page],
          options: { showReferenceNumber },
          metadata: { options: { allowCopy } }
        })
        expect(postSchemaValidation(definition)).toBeUndefined()
      }
    )
  })

  describe('validatePaymentAmount', () => {
    it.each([
      { amount: -10, desc: 'negative' },
      { amount: 100_001, desc: 'above maximum (£100,000)' },
      { amount: NaN, desc: 'NaN' },
      { amount: Infinity, desc: 'Infinity' }
    ])(
      'should return an error when amount is $desc ($amount)',
      ({ amount }) => {
        expect(validatePaymentAmount(amount)).toBeDefined()
      }
    )

    it.each([
      { amount: 0, desc: 'zero / no payment (minimum boundary)' },
      { amount: 0.1, desc: '£0.10' },
      { amount: 0.3, desc: '£0.30' },
      { amount: 1, desc: '£1' },
      { amount: 100_000, desc: 'maximum boundary (£100,000)' }
    ])(
      'should return undefined when amount is $desc ($amount)',
      ({ amount }) => {
        expect(validatePaymentAmount(amount)).toBeUndefined()
      }
    )
  })
})
