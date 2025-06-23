import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import { logger } from '~/src/api/forms/service/shared.js'
import { getErrorMessage } from '~/src/helpers/error-message.js'
import { client } from '~/src/mongo.js'

/**
 * Add a condition to the draft form definition
 * @param {string} formId
 * @param {ConditionWrapperV2} condition
 * @param {FormMetadataAuthor} author
 */
export async function addConditionToDraftFormDefinition(
  formId,
  condition,
  author
) {
  logger.info(`Adding condition ${condition.displayName} to form ID ${formId}`)

  const session = client.startSession()

  try {
    const newForm = await session.withTransaction(async () => {
      // Add the condition to the form definition
      const returnedList = await formDefinition.addCondition(
        formId,
        condition,
        session
      )

      await formMetadata.updateAudit(formId, author, session)

      return returnedList
    })

    logger.info(`Added condition ${condition.displayName} to form ID ${formId}`)

    return newForm
  } catch (err) {
    logger.error(
      `[addCondition] Failed to add condition on Form ID ${formId} - ${getErrorMessage(err)}`
    )

    throw err
  } finally {
    await session.endSession()
  }
}

/**
 * Update a condition on the draft form definition
 * @param {string} formId
 * @param {string} conditionId
 * @param {ConditionWrapperV2} condition
 * @param {FormMetadataAuthor} author
 */
export async function updateConditionOnDraftFormDefinition(
  formId,
  conditionId,
  condition,
  author
) {
  logger.info(`Updating condition ${conditionId} for form ID ${formId}`)

  const session = client.startSession()

  try {
    const updatedList = await session.withTransaction(async () => {
      // Update the condition on the form definition
      const returnedCondition = await formDefinition.updateCondition(
        formId,
        conditionId,
        condition,
        session
      )

      await formMetadata.updateAudit(formId, author, session)

      return returnedCondition
    })

    logger.info(`Updated condition ${conditionId} for form ID ${formId}`)

    return updatedList
  } catch (err) {
    logger.error(
      `[updateCondition] Failed to update condition ${conditionId} on Form ID ${formId} - ${getErrorMessage(err)}`
    )

    throw err
  } finally {
    await session.endSession()
  }
}

/**
 * Remove a condition from the draft form definition
 * @param {string} formId
 * @param {string} conditionId
 * @param {FormMetadataAuthor} author
 */
export async function removeConditionOnDraftFormDefinition(
  formId,
  conditionId,
  author
) {
  logger.info(`Removing condition ${conditionId} for form ID ${formId}`)

  const session = client.startSession()

  try {
    await session.withTransaction(async () => {
      // Update the condition on the form definition
      await formDefinition.deleteCondition(formId, conditionId, session)

      await formMetadata.updateAudit(formId, author, session)
    })

    logger.info(`Removed condition ${conditionId} for form ID ${formId}`)
  } catch (err) {
    logger.error(
      `[removeCondition] Failed to remove condition ${conditionId} on Form ID ${formId} - ${getErrorMessage(err)}`
    )

    throw err
  } finally {
    await session.endSession()
  }
}

/**
 * @import { FormMetadataAuthor, List, FormDefinition, ConditionWrapperV2 } from '@defra/forms-model'
 * @import { ClientSession } from 'mongodb'
 */
