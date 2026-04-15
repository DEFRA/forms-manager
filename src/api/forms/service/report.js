import {
  ComponentType,
  ControllerType,
  FormMetricType,
  FormStatus,
  FormTimelineMetricType,
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
 * @param {Date} [date]
 */
export async function generateReport(date) {
  logger.info(`Generating report for date ${date?.toString()}`)

  const session = client.startSession()

  const metrics = {
    timelineMetrics: /** @type {FormTimelineMetric[]} */ ([]),
    headlineMetrics: new Map(),
    draftMetrics: new Map(),
    liveMetrics: new Map()
  }

  try {
    await session.withTransaction(async () => {
      const metadatas = await getMetadataOfAllForms(session)

      for (const metadata of metadatas) {
        const formId = metadata._id.toString()

        // Only process forms that have been updated since the last check
        if (!date || (metadata.updatedAt && metadata.updatedAt > date)) {
          const draft = await getDefinitionIfExists(
            formId,
            FormStatus.Draft,
            session
          )
          if (draft) {
            metrics.draftMetrics.set(
              formId,
              collectOverviewMetrics(metadata, draft)
            )
          }

          const live = await getDefinitionIfExists(
            formId,
            FormStatus.Live,
            session
          )
          if (live) {
            metrics.liveMetrics.set(
              formId,
              collectOverviewMetrics(metadata, live)
            )
          }

          const strictMetadata = /** @type {FormMetadata} */ ({
            ...metadata,
            id: formId
          })

          collectTimelineMetrics(metrics.timelineMetrics, strictMetadata, date)
        }
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
    headline: Object.fromEntries(metrics.headlineMetrics),
    live: Object.fromEntries(metrics.liveMetrics),
    draft: Object.fromEntries(metrics.draftMetrics),
    timeline: metrics.timelineMetrics
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
 */
export function collectOverviewMetrics(metadata, definition) {
  return {
    type: FormMetricType.OverviewMetric,
    formId: metadata.id,
    formStatus: metadata.live ? FormStatus.Live : FormStatus.Draft,
    summaryMetrics: calcSummaryMetrics(metadata, definition),
    featureCounts: undefined, // TODO - calcFeatureCounts(definition),
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
  if (!date || isSameDay(date, metadata.createdAt)) {
    timelineMetrics.push(
      /** @type {FormTimelineMetric} */ ({
        type: FormMetricType.TimelineMetric,
        formId: metadata.id,
        formStatus: metadata.live ? FormStatus.Live : FormStatus.Draft,
        metricName: FormTimelineMetricType.NewFormsCreated,
        metricValue: 1,
        createdAt: metadata.createdAt
      })
    )
  }
}

/**
 *
 * @param {Partial<FormMetadata>} metadata
 * @param {FormDefinition} definition
 */
export function calcSummaryMetrics(metadata, definition) {
  return /** @type { Record<string, number | string | string[]> } */ ({
    name: metadata.title,
    slug: metadata.slug,
    organisation: metadata.organisation,
    status: metadata.live ? 'live' : 'draft',
    pages: definition.pages.length,
    questionTypes: getUniqueComponentTypes(definition).size,
    conditions: definition.conditions.length,
    sections: definition.sections.length,
    // TODO - needs to handle if draft got deleted when form went live - probably by querying audit
    daysToPublish:
      metadata.live?.createdAt && metadata.draft?.createdAt
        ? daysBetween(metadata.live.createdAt, metadata.draft.createdAt)
        : undefined,
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
