import {
  ComponentType,
  ControllerType,
  FormMetricType,
  FormStatus,
  getErrorMessage,
  hasComponentsEvenIfNoNext,
  hasPaymentQuestionInForm,
  hasSpecificQuestionTypeInForm
} from '@defra/forms-model'
import { StatusCodes } from 'http-status-codes'

import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import { getMetadataOfAllForms } from '~/src/api/forms/repositories/form-metadata-repository.js'
import { logger } from '~/src/api/forms/service/shared.js'
import { client } from '~/src/mongo.js'

/**
 * Adds or updates an option
 * @param {Date} [date] - optional date on which to gather the metrics for
 */
export async function generateReport(date) {
  logger.info(`Generating report for date ${date?.toString()}`)

  const session = client.startSession()

  const metrics = {
    timelineMetrics: /** @type {FormTimelineMetric[]} */ ([]),
    draftMetrics: new Map(),
    liveMetrics: new Map()
  }

  // Add time element so outside of BST shift
  if (date) {
    date.setHours(4)
  }

  try {
    await session.withTransaction(async () => {
      const metadatas = await getMetadataOfAllForms(session)

      for (const metadata of metadatas) {
        const formId = metadata._id.toString()
        const strictMetadata = /** @type {FormMetadata} */ ({
          ...metadata,
          id: formId
        })

        // Only process forms that have been updated since the last check
        if (
          !date ||
          (metadata.updatedAt && isSameDay(metadata.updatedAt, date))
        ) {
          await processDefinition(
            formId,
            FormStatus.Draft,
            strictMetadata,
            metrics.draftMetrics,
            session
          )

          await processDefinition(
            formId,
            FormStatus.Live,
            strictMetadata,
            metrics.liveMetrics,
            session
          )
        }
        collectTimelineMetrics(metrics.timelineMetrics, strictMetadata, date)
      }
    })
  } catch (err) {
    logger.error(
      err,
      `[report] Failed to generate report for date ${date?.toString()} - ${getErrorMessage(err)}`
    )

    throw err
  } finally {
    await session.endSession()
  }

  logger.info(`Generated report for date ${date?.toString()}`)

  return {
    live: Object.fromEntries(metrics.liveMetrics),
    draft: Object.fromEntries(metrics.draftMetrics),
    timeline: metrics.timelineMetrics
  }
}

/**
 * @param {string} formId
 * @param {FormStatus} definitionType
 * @param {FormMetadata} metadata
 * @param {Map<string, any>} metrics
 * @param {ClientSession} session
 */
export async function processDefinition(
  formId,
  definitionType,
  metadata,
  metrics,
  session
) {
  const definition = await getDefinitionIfExists(
    formId,
    definitionType,
    session
  )
  if (definition) {
    metrics.set(
      formId,
      collectOverviewMetrics(metadata, definition, definitionType)
    )
  }
}

/**
 * @param {string} formId
 * @param {FormStatus} status
 * @param {ClientSession} session
 */
export async function getDefinitionIfExists(formId, status, session) {
  try {
    return await formDefinition.get(formId, status, session)
  } catch (err) {
    const error =
      /** @type {{ isBoom?: boolean, output?: { statusCode?: number }}} */ (err)
    if (error.isBoom && error.output?.statusCode === StatusCodes.NOT_FOUND) {
      return undefined
    }
    throw err
  }
}

/**
 * Collect overview metrics
 * @param {Partial<FormMetadata>} metadata
 * @param {FormDefinition} definition
 * @param {FormStatus} definitionType
 */
export function collectOverviewMetrics(metadata, definition, definitionType) {
  return {
    type: FormMetricType.OverviewMetric,
    formId: metadata.id,
    formStatus: metadata.live ? FormStatus.Live : FormStatus.Draft,
    summaryMetrics: calcSummaryMetrics(metadata, definition, definitionType),
    featureCounts: {},
    submissionsCount: 0,
    updatedAt: new Date()
  }
}

/**
 * Collect timeline metrics
 * @param {FormTimelineMetric[]} timelineMetrics
 * @param {FormMetadata} metadata
 * @param { Date | undefined } date
 */
export function collectTimelineMetrics(timelineMetrics, metadata, date) {
  // NewFormsCreated - draft only
  if (
    metadata.draft?.createdAt &&
    (!date || isSameDay(date, metadata.draft.createdAt))
  ) {
    timelineMetrics.push(
      /** @type {FormTimelineMetric} */ ({
        type: FormMetricType.TimelineMetric,
        formId: metadata.id,
        formStatus: FormStatus.Draft,
        metricName: 'NewFormsCreated',
        metricValue: 1,
        createdAt: metadata.draft.createdAt
      })
    )
  }

  // FormsPublished - live only
  if (
    metadata.live?.createdAt &&
    (!date || isSameDay(date, metadata.live.createdAt))
  ) {
    timelineMetrics.push(
      /** @type {FormTimelineMetric} */ ({
        type: FormMetricType.TimelineMetric,
        formId: metadata.id,
        formStatus: FormStatus.Live,
        metricName: 'FormsPublished',
        metricValue: 1,
        createdAt: metadata.live.createdAt
      })
    )
  }
}

/**
 *
 * @param {Partial<FormMetadata>} metadata
 * @param {FormDefinition} definition
 * @param {FormStatus} definitionType
 */
export function calcSummaryMetrics(metadata, definition, definitionType) {
  return /** @type { Record<string, number | string | string[]> } */ ({
    name: metadata.title,
    slug: metadata.slug,
    organisation: metadata.organisation,
    status: definitionType,
    pages: definition.pages.length,
    questionTypes: getUniqueComponentTypes(definition).size,
    conditions: definition.conditions.length,
    sections: definition.sections.length,
    features: getFeatureList(definition)
  })
}

/**
 * Take the difference between the dates and divide by milliseconds per day.
 * Round to nearest whole number.
 * @param {Date} first
 * @param {Date} second
 */
export function daysBetween(first, second) {
  return Math.round(
    (second.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)
  )
}

/**
 * Check if two dates are for the same date (i.e. compare without any time element)
 * @param { Date | undefined } first
 * @param { Date | undefined } second
 */
export function isSameDay(first, second) {
  if (!first || !second) {
    return false
  }
  const firstStr = first.toISOString().substring(0, 10)
  const secondStr = second.toISOString().substring(0, 10)
  return firstStr === secondStr
}

/**
 *
 * @param {FormDefinition} definition
 */
export function getFeatureList(definition) {
  const features = []
  if (
    definition.pages.some((p) => p.controller === ControllerType.FileUpload)
  ) {
    features.push('File upload')
  }
  if (
    definition.pages.some(
      (p) => p.controller === ControllerType.SummaryWithConfirmationEmail
    )
  ) {
    features.push('Email confirmation')
  }
  if (hasPaymentQuestionInForm(definition)) {
    features.push('GOV.UK Pay')
  }
  if (
    hasSpecificQuestionTypeInForm(definition, ComponentType.DeclarationField)
  ) {
    features.push('Declarations')
  }
  return features
}

/**
 *
 * @param {FormDefinition} definition
 */
export function getUniqueComponentTypes(definition) {
  const componentTypes = new Set()
  for (const page of definition.pages) {
    if (hasComponentsEvenIfNoNext(page)) {
      page.components.forEach((comp) => componentTypes.add(comp.type))
    }
  }
  return componentTypes
}

/**
 * @import { ClientSession } from 'mongodb'
 * @import { FormDefinition, FormMetadata, FormTimelineMetric } from '@defra/forms-model'
 */
