import { randomUUID } from 'crypto'

import { ControllerType, Engine } from '@defra/forms-model'

import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import {
  findComponentsWithoutIds,
  summaryHelper
} from '~/src/api/forms/repositories/helpers.js'
import { addIdToSummary } from '~/src/api/forms/service/page.js'
import {
  DRAFT,
  logger,
  partialAuditFields
} from '~/src/api/forms/service/shared.js'
import { client } from '~/src/mongo.js'

/**
 * Repositions the summary page if it's not the last index of pages
 * @param {string} formId
 * @param {FormDefinition} definition
 * @param {FormMetadataAuthor} author
 */
export async function repositionSummaryPipeline(formId, definition, author) {
  const summaryResult = summaryHelper(definition)
  const { shouldRepositionSummary } = summaryResult

  logger.info(`Checking position of summary on ${formId}`)

  if (!shouldRepositionSummary) {
    logger.info(`Position of summary on ${formId} correct`)
    return summaryResult
  }

  logger.info(`Updating position of summary on Form ID ${formId}`)

  const session = client.startSession()

  const { summary } = summaryResult
  const summaryDefined = /** @type {PageSummary} */ (summary)
  const summaryWithId = addIdToSummary(summaryDefined)

  try {
    await session.withTransaction(async () => {
      await formDefinition.removeMatchingPages(
        formId,
        { controller: ControllerType.Summary },
        session
      )

      await formDefinition.addPageAtPosition(
        formId,
        /** @type {PageSummary} */ (summaryWithId),
        session,
        {}
      )

      // Update the form with the new draft state
      await formMetadata.update(
        formId,
        { $set: partialAuditFields(new Date(), author) },
        session
      )
    })
  } catch (err) {
    logger.error(
      err,
      `Failed to update position of summary on Form ID ${formId}`
    )
    throw err
  } finally {
    await session.endSession()
  }

  logger.info(`Updated position of summary on Form ID ${formId}`)

  return { ...summaryResult, summary: summaryWithId }
}

/**
 * Will cycle through a definition and add pageIds to all the pages where they are missing
 * @param {string} formId
 * @param {FormMetadataAuthor} author
 */
export async function addPageIdsPipeline(formId, author) {
  logger.info(`Adding missing page ids for form with ID ${formId}`)
  const session = client.startSession()
  let updated = 0

  try {
    await session.withTransaction(
      async () => {
        const form = await formDefinition.get(formId, DRAFT, session)

        const pagesWithoutIds = form.pages.filter((page) => !page.id)

        for (const page of pagesWithoutIds) {
          await formDefinition.addPageFieldByPath(
            formId,
            page.path,
            { id: randomUUID() },
            session
          )
          updated++
        }

        // Update the form with the new draft state
        await formMetadata.update(
          formId,
          { $set: partialAuditFields(new Date(), author) },
          session
        )
      },
      { readPreference: 'primary' }
    )
  } catch (err) {
    logger.error(
      err,
      `Failed to add missing page ids for form with ID ${formId}`
    )
    throw err
  } finally {
    await session.endSession()
  }
  logger.info(`Added ${updated} missing page ids for form with ID ${formId}`)

  return formDefinition.get(formId, DRAFT)
}

/**
 * Adds ids to all components that miss them
 * @param {string} formId
 * @param {FormDefinition} draftFormDefinition
 * @param {FormMetadataAuthor} author
 */
export async function addComponentIdsPipeline(
  formId,
  draftFormDefinition,
  author
) {
  logger.info(`Adding missing component ids for form with ID ${formId}`)

  const componentsWithMissingIds = findComponentsWithoutIds(draftFormDefinition)

  if (!componentsWithMissingIds.length) {
    logger.info(`No missing component ids for form with ID ${formId}`)
    return draftFormDefinition
  }

  let updated = 0
  const session = client.startSession()

  try {
    await session.withTransaction(async () => {
      for (const { pageId, componentName } of componentsWithMissingIds) {
        await formDefinition.addComponentFieldByName(
          formId,
          pageId,
          componentName,
          { id: randomUUID() },
          session
        )
        updated++
      }

      // Update the form with the new draft state
      await formMetadata.update(
        formId,
        { $set: partialAuditFields(new Date(), author) },
        session
      )
    })
  } catch (err) {
    logger.error(
      err,
      `Failed to add missing page ids for form with ID ${formId}`
    )
    throw err
  } finally {
    await session.endSession()
  }
  logger.info(
    `Added ${updated} missing component ids for form with ID ${formId}`
  )

  return formDefinition.get(formId, DRAFT)
}

/**
 * Should set the engine version to v2 - last step in migration pipeline
 * @param {string} formId
 * @param {FormDefinition} formDraftDefinition
 * @param {FormMetadataAuthor} author
 */
export async function setEngineVersionToV2(
  formId,
  formDraftDefinition,
  author
) {
  if (formDraftDefinition.engine === Engine.V2) {
    return
  }
  const session = client.startSession()

  try {
    await session.withTransaction(
      async () => {
        await formDefinition.setEngineVersion(
          formId,
          Engine.V2,
          formDraftDefinition,
          session
        )

        // Update the form with the new draft state
        await formMetadata.update(
          formId,
          { $set: partialAuditFields(new Date(), author) },
          session
        )
      },
      { readPreference: 'primary' }
    )
  } catch (err) {
    logger.error(
      err,
      `Failed to update form with ID ${formId} to engine version 2`
    )
    throw err
  } finally {
    await session.endSession()
  }
}

/**
 * Migrates a v1 definition to v2
 * @param {string} formId
 * @param {FormMetadataAuthor} author
 */
export async function migrateDefinitionToV2(formId, author) {
  const formDraftDefinition = await formDefinition.get(formId, DRAFT)

  if (formDraftDefinition.engine === Engine.V2) {
    return formDraftDefinition
  }
  logger.info(`Migrating form with ID ${formId} to engine version 2`)

  let updatedDraftDefinition = formDraftDefinition

  try {
    await repositionSummaryPipeline(formId, formDraftDefinition, author)
    updatedDraftDefinition = await addPageIdsPipeline(formId, author)
    updatedDraftDefinition = await addComponentIdsPipeline(
      formId,
      updatedDraftDefinition,
      author
    )
    await setEngineVersionToV2(formId, updatedDraftDefinition, author)
  } catch (err) {
    logger.error(
      err,
      `Failed to migrate form with ID ${formId} to engine version 2`
    )
    throw err
  }

  logger.info(`Migrated form with ID ${formId} to engine version 2`)

  return formDefinition.get(formId)
}

// TODO: add migrate to V1

/**
 * @import { FormDefinition, FormMetadataAuthor, Page, PageSummary } from '@defra/forms-model'
 */
