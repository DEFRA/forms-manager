import Boom from '@hapi/boom'

import { validateConditionExists } from '~/src/api/forms/service/helpers/condition-validator.js'

describe('validateConditionExists', () => {
  const mockFormDefinition = {
    conditions: [
      {
        name: 'existing-condition',
        displayName: 'Test',
        conditions: []
      }
    ],
    pages: [],
    lists: [],
    sections: []
  }

  describe('when conditionName is undefined or null', () => {
    it('returns early for undefined conditionName', () => {
      expect(() => {
        validateConditionExists(mockFormDefinition, undefined)
      }).not.toThrow()
    })

    it('returns early for null conditionName', () => {
      expect(() => {
        validateConditionExists(mockFormDefinition, null)
      }).not.toThrow()
    })
  })

  describe('when formDefinition is invalid', () => {
    it('throws error for undefined formDefinition', () => {
      expect(() => {
        validateConditionExists(undefined, 'some-condition')
      }).toThrow(Boom.badRequest('Form definition not found'))
    })
  })

  describe('when condition exists', () => {
    it('passes validation', () => {
      expect(() => {
        validateConditionExists(mockFormDefinition, 'existing-condition')
      }).not.toThrow()
    })
  })

  describe('when condition does not exist', () => {
    it('throws error for non-existent condition', () => {
      expect(() => {
        validateConditionExists(mockFormDefinition, 'non-existent-condition')
      }).toThrow(
        Boom.badRequest(
          "Condition 'non-existent-condition' not found in form definition"
        )
      )
    })

    it('throws error when conditions array is empty', () => {
      const emptyFormDef = {
        conditions: [],
        pages: [],
        lists: [],
        sections: []
      }

      expect(() => {
        validateConditionExists(emptyFormDef, 'any-condition')
      }).toThrow(
        Boom.badRequest(
          "Condition 'any-condition' not found in form definition"
        )
      )
    })
  })
})
