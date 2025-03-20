import { ValidationError } from 'joi'

import { sortIdsSchema } from '~/src/models/forms.js'

describe('forms model', () => {
  describe('sortIdsSchema', () => {
    it('should accept a list of uuids', () => {
      const payload = [
        '49e31f0d-63e4-4da4-9525-1494a7d7edc5',
        '90c9d202-5594-4953-b77f-3a65022186c6',
        '0cc7b818-a64f-4159-ba86-ef01f9e46e32'
      ]

      const { value, error } = sortIdsSchema.validate(payload)
      expect(error).toBeUndefined()
      expect(value).toEqual(payload)
    })

    it('should not accept an invalid list', () => {
      expect(sortIdsSchema.validate([]).error).toEqual(
        new ValidationError(
          '"value" does not contain 1 required value(s)',
          [],
          []
        )
      )
      expect(sortIdsSchema.validate(['not-a-valid-uuid']).error).toEqual(
        new ValidationError(
          '"[0]" must be a valid GUID',
          [],
          ['not-a-valid-uuid']
        )
      )
    })
  })
})
