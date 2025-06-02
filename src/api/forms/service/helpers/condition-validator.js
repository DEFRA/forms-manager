import Boom from '@hapi/boom'

/**
 * Validates that a condition exists in the form definition
 * @param {FormDefinition | undefined} formDefinition
 * @param {string | null | undefined} conditionName
 * @throws {Boom} If condition doesn't exist
 */
export function validateConditionExists(formDefinition, conditionName) {
  if (conditionName === undefined || conditionName === null) {
    return
  }

  if (!formDefinition) {
    throw Boom.badRequest('Form definition not found')
  }

  const conditionExists = formDefinition.conditions.some(
    (condition) => 'id' in condition && condition.id === conditionName
  )

  if (!conditionExists) {
    throw Boom.badRequest(
      `Condition '${conditionName}' not found in form definition`
    )
  }
}

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
