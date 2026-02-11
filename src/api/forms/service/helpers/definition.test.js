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
  buildTextFieldComponent
} from '~/src/api/forms/__stubs__/definition.js'
import { InvalidFormDefinitionError } from '~/src/api/forms/errors.js'
import {
  getValidationSchema,
  postSchemaValidation,
  validate,
  validatePaymentAmount
} from '~/src/api/forms/service/helpers/definition.js'

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
    })
  })

  describe('validatePaymentAmount', () => {
    it.each([
      { amount: -10, desc: 'negative' },
      { amount: 0, desc: 'zero' },
      { amount: 0.1, desc: 'below minimum (£0.30)' },
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
      { amount: 0.3, desc: 'minimum boundary (£0.30)' },
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
