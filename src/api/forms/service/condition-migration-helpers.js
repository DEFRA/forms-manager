import { randomUUID } from 'crypto'

import {
  ComponentType,
  ConditionType,
  hasComponentsEvenIfNoNext,
  hasListField,
  isListType
} from '@defra/forms-model'

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
 * @param {object} conditionValue
 * @returns {conditionValue is RelativeDateValueData}
 */
export function isConditionRelativeDateData(conditionValue) {
  return (
    typeof conditionValue === 'object' &&
    'type' in conditionValue &&
    conditionValue.type === ConditionType.RelativeDate
  )
}

/**
 * @param {ConditionData} conditionData
 * @returns {ConditionType}
 */
export function determineConditionType(conditionData) {
  if (isListType(conditionData.field.type)) {
    return ConditionType.ListItemRef
  }

  switch (conditionData.field.type) {
    case ComponentType.NumberField:
      return ConditionType.NumberValue
    case ComponentType.YesNoField:
      return ConditionType.BooleanValue
    case ComponentType.DatePartsField:
      return conditionData.value.type === ConditionType.RelativeDate
        ? ConditionType.RelativeDate
        : ConditionType.DateValue
    default:
      return ConditionType.StringValue
  }
}

/**
 * @param { ConditionValueData | RelativeDateValueData | undefined } dateObj
 * @returns {string}
 */
export function relativeDateValueToString(dateObj) {
  const period = /** @type {string} */ (
    dateObj && 'period' in dateObj ? dateObj.period : ''
  )
  const unit = /** @type {string} */ (
    dateObj && 'unit' in dateObj ? dateObj.unit : ''
  )
  const direction = /** @type {string} */ (
    dateObj && 'direction' in dateObj ? dateObj.direction : ''
  )
  return `period: ${period} unit: ${unit} direction: ${direction}`
}

/**
 * @param {ConditionData} conditionData
 * @returns {RelativeDateValueDataV2}
 */
export function extractRelativeDateValue(conditionData) {
  if (!isConditionRelativeDateData(conditionData.value)) {
    throw new Error(
      `Missing values in condition value for relative date: ${relativeDateValueToString(conditionData.value)}`
    )
  }

  const dateValue = /** @type {RelativeDateValueData } */ (conditionData.value)

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if ((dateValue?.period ?? '') === '') {
    throw new Error(
      `Missing period value in condition value for relative date: ${relativeDateValueToString(conditionData.value)}`
    )
  }

  return {
    period: parseInt(dateValue.period),
    unit: dateValue.unit,
    direction: dateValue.direction
  }
}

/**
 * Finds a component by name across all pages
 * @param {FormDefinition} definition
 * @param {string} componentName
 * @returns {ComponentDef | undefined}
 */
export function findComponentAcrossPages(definition, componentName) {
  for (const page of definition.pages) {
    if (!hasComponentsEvenIfNoNext(page)) {
      continue
    }
    const component = page.components.find(
      (component) => component.name === componentName
    )
    if (component) {
      return component
    }
  }

  throw new Error(`Component of name ${componentName} not found in definition`)
}

/**
 * @param {ConditionData} conditionData
 * @param {string} valueStr
 * @param {FormDefinition} definition
 * @returns { ConditionValueDataV2 }
 */
export function convertToListRef(conditionData, valueStr, definition) {
  const component = findComponentAcrossPages(
    definition,
    conditionData.field.name
  )
  const listId = hasListField(component) ? component.list : 'unknown'
  const list = definition.lists.find((list) => list.id === listId)
  const listItem = list?.items.find((item) => item.value === valueStr)

  if (!listItem) {
    throw new Error(
      `List item ${valueStr} not found in list id ${listId} for component ${component?.name}`
    )
  }

  return {
    listId,
    itemId: /** @type {string} */ (listItem.id)
  }
}

/**
 * @param {ConditionData} conditionData
 * @param {FormDefinition} definition
 * @returns { ConditionValueDataV2 }
 */
export function determineConditionValue(conditionData, definition) {
  const valueStr =
    'value' in conditionData.value ? conditionData.value.value : ''

  if (isListType(conditionData.field.type)) {
    return convertToListRef(conditionData, valueStr, definition)
  }

  switch (conditionData.field.type) {
    case ComponentType.NumberField:
      return parseInt(valueStr)
    case ComponentType.YesNoField:
      return valueStr === 'true'
    case ComponentType.DatePartsField:
      return conditionData.value.type === ConditionType.RelativeDate
        ? extractRelativeDateValue(conditionData)
        : valueStr
    default:
      return valueStr
  }
}

/**
 *
 * @param {ConditionData} conditionData
 * @param {Map<string, string>} fieldNameToComponentId
 * @param {Set<string>} usedConditions
 * @param {FormDefinition} definition
 * @returns {ConditionDataV2 | null}
 */
export function convertConditionDataToV2(
  conditionData,
  fieldNameToComponentId,
  usedConditions,
  definition
) {
  if (
    !isConditionValueData(conditionData.value) &&
    !isConditionRelativeDateData(conditionData.value)
  ) {
    throw new Error(
      // @ts-expect-error - cannot determine type since neither ConditionValueData nor ConditionRelativeDateData
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
      type: determineConditionType(conditionData),
      value: determineConditionValue(conditionData, definition)
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
 * @import { ComponentDef, ConditionGroupData, ConditionData, ConditionDataV2, ConditionValueDataV2, ConditionRefData, ConditionValueData, FormDefinition, List, RelativeDateValueData, RelativeDateValueDataV2 } from '@defra/forms-model'
 */
