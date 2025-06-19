import { normaliseError } from '~/src/helpers/error-utils.js'

describe('error-utils', () => {
  describe('normaliseError', () => {
    it('should return the error if it is already an Error instance', () => {
      const originalError = new Error('Test error message')
      const result = normaliseError(originalError)

      expect(result).toBe(originalError)
      expect(result.message).toBe('Test error message')
    })

    it('should create a new Error with default message for non-Error values', () => {
      const result = normaliseError('string error')

      expect(result).toBeInstanceOf(Error)
      expect(result.message).toBe('Unknown error')
    })

    it('should create a new Error with custom fallback message for non-Error values', () => {
      const result = normaliseError('string error', 'Custom fallback message')

      expect(result).toBeInstanceOf(Error)
      expect(result.message).toBe('Custom fallback message')
    })

    it('should handle null values', () => {
      const result = normaliseError(null)

      expect(result).toBeInstanceOf(Error)
      expect(result.message).toBe('Unknown error')
    })

    it('should handle undefined values', () => {
      const result = normaliseError(undefined)

      expect(result).toBeInstanceOf(Error)
      expect(result.message).toBe('Unknown error')
    })

    it('should handle object values', () => {
      const result = normaliseError({ message: 'not an error' }, 'Object error')

      expect(result).toBeInstanceOf(Error)
      expect(result.message).toBe('Object error')
    })

    it('should handle number values', () => {
      const result = normaliseError(404, 'Numeric error')

      expect(result).toBeInstanceOf(Error)
      expect(result.message).toBe('Numeric error')
    })
  })
})
