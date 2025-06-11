import {
  ComponentType,
  ConditionType,
  Coordinator,
  OperatorName
} from '@defra/forms-model'

import {
  convertConditionDataToV2,
  isConditionData,
  isConditionValueData
} from '~/src/api/forms/service/condition-migration-helpers.js'

/**
 * @type {ConditionData}
 */
const conditionData = {
  field: {
    name: 'field1',
    type: ComponentType.TextField,
    display: 'dummy'
  },
  operator: OperatorName.Is,
  value: {
    type: ConditionType.Value,
    value: 'test-value',
    display: 'foobar'
  }
}

describe('convertConditionDataToV2', () => {
  it('converts a valid conditionData when componentId exists', () => {
    const fieldNameToComponentId = new Map([['field1', 'component-123']])
    const usedConditions = new Set()
    const result = convertConditionDataToV2(
      conditionData,
      fieldNameToComponentId,
      usedConditions
    )
    expect(result).toEqual({
      id: expect.any(String),
      componentId: 'component-123',
      operator: 'is',
      value: {
        type: ConditionType.StringValue,
        value: 'test-value'
      }
    })
  })

  it('throws if conditionData.value.type is not ConditionType.Value', () => {
    const fieldNameToComponentId = new Map()
    const usedConditions = new Set()

    /**
     * @type {ConditionData}
     */
    const invalidConditionData = {
      ...conditionData,
      // @ts-expect-error -- we're deliberately testing the type guard
      value: { type: 'OtherType', value: 'abc' }
    }
    expect(() =>
      convertConditionDataToV2(
        invalidConditionData,
        fieldNameToComponentId,
        usedConditions
      )
    ).toThrow('Unsupported condition value type found: OtherType')
  })

  it('throws if componentId does not exist but field is in use', () => {
    const fieldNameToComponentId = new Map()
    const usedConditions = new Set(['field1'])
    expect(() =>
      convertConditionDataToV2(
        conditionData,
        fieldNameToComponentId,
        usedConditions
      )
    ).toThrow(
      "Cannot migrate condition: field name 'field1' not found in components but is in use."
    )
  })

  it('returns null if componentId does not exist and field is not in use', () => {
    const fieldNameToComponentId = new Map()
    const usedConditions = new Set()
    const result = convertConditionDataToV2(
      conditionData,
      fieldNameToComponentId,
      usedConditions
    )
    expect(result).toBeNull()
  })
})

describe('isConditionValueData', () => {
  it('returns true for a valid ConditionValueData object', () => {
    const value = { type: ConditionType.Value, value: 'abc' }
    expect(isConditionValueData(value)).toBe(true)
  })

  it('returns false if type is not ConditionType.Value', () => {
    const value = { type: 'OtherType', value: 'abc' }
    expect(isConditionValueData(value)).toBe(false)
  })

  it('returns false if type property is missing', () => {
    const value = { value: 'abc' }
    expect(isConditionValueData(value)).toBe(false)
  })

  it('returns false if object is empty', () => {
    expect(isConditionValueData({})).toBe(false)
  })
})

describe('isConditionData', () => {
  it('returns true for a valid ConditionData object', () => {
    expect(isConditionData(conditionData)).toBe(true)
  })

  it('returns false for a valid ConditionGroupData object', () => {
    /**
     * @type {ConditionRefData}
     */
    const conditionGroupData = {
      conditionDisplayName: 'Group Condition',
      conditionName: 'group-condition',
      coordinator: Coordinator.AND
    }

    expect(isConditionData(conditionGroupData)).toBe(false)
  })
})

/**
 * @import { ConditionData, ConditionRefData } from '@defra/forms-model'
 */
