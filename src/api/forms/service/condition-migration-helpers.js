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
 * @param {Set<string>} usedConditions
 * @returns {ConditionDataV2 | null}
 */
export function convertConditionDataToV2(
  conditionData,
  fieldNameToComponentId,
  usedConditions
) {
  if (!isConditionValueData(conditionData.value)) {
    throw new Error(
      `Unsupported condition value type found: ${conditionData.value.type}`
    )
  }

  const componentId = fieldNameToComponentId.get(conditionData.field.name)

  // if a condition can't be migrated and is in use, throw an error, else we discard the orphaned condition
  if (componentId) {
    return {
      id: randomUUID().toString(),
      componentId,
      operator: conditionData.operator,
      value: {
        type: ConditionType.StringValue,
        value: conditionData.value.value
      }
    }
  } else if (usedConditions.has(conditionData.field.name)) {
    throw new Error(
      `Cannot migrate condition: field name '${conditionData.field.name}' not found in components but is in use.`
    )
  } else {
    return null // This condition is not used and can be discarded
  }
}

/**
 * @import { ConditionGroupData, ConditionData, ConditionDataV2, ConditionRefData, ConditionValueData, RelativeDateValueData } from '@defra/forms-model'
 */
