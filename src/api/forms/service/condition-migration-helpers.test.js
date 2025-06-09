import { ComponentType, ConditionType, OperatorName } from '@defra/forms-model'

import { convertConditionDataToV2 } from '~/src/api/forms/service/condition-migration-helpers.js'

describe('convertConditionDataToV2', () => {
  /**
   * @type {import('@defra/forms-model').ConditionData}
   */
  const baseConditionData = {
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

  it('converts a valid conditionData when componentId exists', () => {
    const fieldNameToComponentId = new Map([['field1', 'component-123']])
    const usedConditions = new Set()
    const result = convertConditionDataToV2(
      baseConditionData,
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
     * @type {import('@defra/forms-model').ConditionData}
     */
    const invalidConditionData = {
      ...baseConditionData,
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
        baseConditionData,
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
      baseConditionData,
      fieldNameToComponentId,
      usedConditions
    )
    expect(result).toBeNull()
  })
})
