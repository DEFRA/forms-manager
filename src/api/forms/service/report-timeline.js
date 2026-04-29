import { FormMetricType, FormStatus, getErrorMessage } from '@defra/forms-model'
import { isSameDay } from 'date-fns'

import { getMetadataCursorOfAllForms } from '~/src/api/forms/repositories/form-metadata-repository.js'
import { mapMetadata } from '~/src/api/forms/service/helpers/mapper.js'
import { logger } from '~/src/helpers/logging/logger.js'
import { client } from '~/src/mongo.js'

/**
 * Generates a set of timeline metrics for each form
 * @param {Date} date - date on which to gather the metrics for
 */
export async function generateReportTimeline(date) {
  logger.info(`Generating timeline report for date ${date.toString()}`)

  const session = client.startSession()

  const timelineMetrics = /** @type {FormTimelineMetric[]} */ ([])

  try {
    await session.withTransaction(async () => {
      const metadataCursor = getMetadataCursorOfAllForms(session)

      for await (const metadata of metadataCursor) {
        const strictMetadata = mapMetadata(metadata)

        // Gather timeline metrics for all time, or just a specific day
        collectTimelineMetrics(timelineMetrics, strictMetadata, date)
      }
    })
  } catch (err) {
    logger.error(
      err,
      `[report] Failed to generate timeline report for date ${date.toString()} - ${getErrorMessage(err)}`
    )

    throw err
  } finally {
    await session.endSession()
  }

  logger.info(`Generated timeline report for date ${date.toString()}`)

  return {
    timeline: timelineMetrics
  }
}

/**
 * Collect timeline metrics
 * @param {FormTimelineMetric[]} timelineMetrics
 * @param {FormMetadata} metadata
 * @param {Date} date
 */
export function collectTimelineMetrics(timelineMetrics, metadata, date) {
  // NewFormsCreated - draft only
  if (metadata.draft?.createdAt && isSameDay(date, metadata.draft.createdAt)) {
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
  if (metadata.live?.createdAt && isSameDay(date, metadata.live.createdAt)) {
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
 * @import { FormMetadata, FormTimelineMetric } from '@defra/forms-model'
 */
