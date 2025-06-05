import { randomUUID } from 'crypto'

import { ConditionType } from '@defra/forms-model'

/**
 *
 * @param {ConditionGroupData | ConditionData | ConditionRefData} condition
 * @returns {condition is import('@defra/forms-model').ConditionData}
 */
export function isConditionData(condition) {
  return (
    typeof condition === 'object' &&
    'value' in condition &&
    typeof condition.field === 'object' &&
    'field' in condition
  )
}

/**
 * @param {object} conditionValue
 * @returns {conditionValue is ConditionValueData}
 */
export function isConditionValueData(conditionValue) {
  return (
    typeof conditionValue === 'object' &&
    'type' in conditionValue &&
    conditionValue.type === ConditionType.Value
  )
}

/**
 *
 * @param {ConditionData} conditionData
 * @param {Map<string, string>} fieldNameToComponentId
 * @returns {ConditionDataV2}
 */
export function convertConditionDataToV2(
  conditionData,
  fieldNameToComponentId
) {
  if (!isConditionValueData(conditionData.value)) {
    throw new Error(
      `Unsupported condition value type found: ${conditionData.value.type}`
    )
  }

  const componentId = fieldNameToComponentId.get(conditionData.field.name)

  if (!componentId || typeof componentId !== 'string') {
    throw new Error(
      `Cannot migrate condition: field name '${conditionData.field.name}' not found in components.`
    )
  }

  return {
    id: randomUUID().toString(),
    componentId,
    operator: conditionData.operator,
    value: {
      type: ConditionType.StringValue,
      value: conditionData.value.value
    }
  }
}
// @ts-check

/**
 * @import { ConditionGroupData, ConditionData, ConditionDataV2, ConditionRefData, ConditionValueData, RelativeDateValueData } from '@defra/forms-model'
 */
