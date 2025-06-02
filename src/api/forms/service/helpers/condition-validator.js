import Boom from '@hapi/boom'

/**
 * Validates that a condition exists in the form definition
 * @param {FormDefinition | undefined} formDefinition
 * @param {string | null | undefined} conditionId
 * @throws {Boom} If condition doesn't exist
 */
export function validateConditionExists(formDefinition, conditionId) {
  if (conditionId === undefined || conditionId === null) {
    return
  }

  if (!formDefinition) {
    throw Boom.badRequest('Form definition not found')
  }

  const conditionExists = formDefinition.conditions.some(
    (condition) => 'id' in condition && condition.id === conditionId
  )

  if (!conditionExists) {
    throw Boom.badRequest(
      `Condition '${conditionId}' not found in form definition`
    )
  }
}

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
