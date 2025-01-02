import { escapeRegExp } from '~/src/helpers/string-utils.js'

/**
 * Builds the filter conditions for querying forms by title.
 * @param {string} title - The title to filter by.
 * @returns {FilterConditions} The filter conditions for MongoDB query.
 */
export function buildFilterConditions(title) {
  const conditions = {}

  if (title) {
    const regex = new RegExp(escapeRegExp(title), 'i')
    conditions.title = { $regex: regex }
  }

  return conditions
}

/**
 * Builds the aggregation pipeline and aggregation options for the query.
 * @param {string} sortBy - Field to sort by ('updatedAt' or 'title').
 * @param {string} order - Sort order ('asc' or 'desc').
 * @param {string} title - The title to filter by.
 * @returns {{ pipeline: PipelineStage[], aggOptions: AggregateOptions }} The pipeline stages and aggregation options.
 */
export function buildAggregationPipeline(sortBy, order, title) {
  const pipeline = []
  const filterConditions = buildFilterConditions(title)

  // Add $match stage if there are filter conditions
  if (Object.keys(filterConditions).length > 0) {
    pipeline.push({ $match: filterConditions })
  }

  addRankingStage(pipeline, title)

  addDateFieldStage(pipeline)

  const collation = addSortingStage(pipeline, sortBy, order)

  const aggOptions = collation ? { collation } : {}

  return { pipeline, aggOptions }
}

/**
 * Adds the ranking stage to the pipeline based on the title.
 * @param {PipelineStage[]} pipeline - The aggregation pipeline stages.
 * @param {string} title - The title to filter by.
 */
export function addRankingStage(pipeline, title) {
  if (title) {
    const searchTerm = title.trim()

    // Add 'matchScore' field to rank the documents
    pipeline.push({
      $addFields: {
        matchScore: /** @type {AddFieldsSwitch} */ ({
          $switch: {
            branches: [
              // Rank 1: Exact whole title match (case-insensitive)
              {
                case: {
                  $eq: [{ $toLower: '$title' }, searchTerm.toLowerCase()]
                },
                then: 1
              },
              // Rank 2: Whole word match in the title (case-insensitive)
              {
                case: {
                  $regexMatch: {
                    input: '$title',
                    regex: `\\b${escapeRegExp(searchTerm)}\\b`,
                    options: 'i'
                  }
                },
                then: 2
              },
              // Rank 3: Partial substring match in the title (case-insensitive)
              {
                case: {
                  $regexMatch: {
                    input: '$title',
                    regex: escapeRegExp(searchTerm),
                    options: 'i'
                  }
                },
                then: 3
              }
            ],
            default: 4
          }
        })
      }
    })
  } else {
    pipeline.push({
      $addFields: {
        matchScore: 0
      }
    })
  }
}

/**
 * Adds the date field stage to the pipeline to extract date only from 'updatedAt'.
 * @param {PipelineStage[]} pipeline - The aggregation pipeline stages.
 */
export function addDateFieldStage(pipeline) {
  const dateFieldStage = {
    $addFields: {
      updatedDateOnly: {
        $dateToString: {
          format: '%Y-%m-%d',
          date: '$updatedAt',
          timezone: 'UTC'
        }
      }
    }
  }
  pipeline.push(dateFieldStage)
}

/**
 * Adds the sorting stage to the pipeline based on the sortBy parameter.
 * @param {PipelineStage[]} pipeline - The aggregation pipeline stages.
 * @param {string} sortBy - Field to sort by ('updatedAt' or 'title').
 * @param {string} order - Sort order ('asc' or 'desc').
 * @returns {CollationOptions | null} The collation options if necessary.
 */
export function addSortingStage(pipeline, sortBy, order) {
  const sortOrder = order === 'asc' ? 1 : -1
  const collation = { locale: 'en', strength: 1 }

  switch (sortBy) {
    case 'title':
      pipeline.push({
        $sort: {
          // Primary sort is title
          title: sortOrder,
          // Then newest first if titles tie
          updatedDateOnly: -1,
          // Then alphabetical (case-insensitive) on displayName
          'updatedBy.displayName': 1
        }
      })
      break

    case 'updatedAt':
      pipeline.push({
        $sort: {
          updatedDateOnly: sortOrder,
          'updatedBy.displayName': 1
        }
      })
      break

    default:
      pipeline.push({
        $sort: {
          updatedDateOnly: -1,
          'updatedBy.displayName': 1
        }
      })
      break
  }

  return collation
}

/**
 * @typedef {object} FilterConditions
 * @property {{ $regex: RegExp }} [title] - Optional MongoDB regex query for title matching
 */

/**
 * @typedef {{
 *   case: {
 *     $eq?: [{$toLower: string} | string, string],
 *     $regexMatch?: {
 *       input: string,
 *       regex: string,
 *       options: string
 *     }
 *   },
 *   then: number
 * }} SwitchBranch
 */

/**
 * @typedef {{
 *   branches: Array<SwitchBranch>,
 *   default: number
 * }} SwitchExpression
 */

/**
 * @typedef {{
 *   $switch: SwitchExpression
 * }} AddFieldsSwitch
 */

/**
 * @typedef {{[key: string]: number | {
 *   $dateToString?: {
 *     format: string,
 *     date: string,
 *     timezone: string
 *   },
 *   $switch?: SwitchExpression
 * }}} AddFieldsStage
 */

/**
 * @typedef {object} PipelineStage
 * @property {FilterConditions} [$match] - MongoDB $match stage for filtering documents
 * @property {AddFieldsStage} [$addFields] - MongoDB $addFields stage for adding computed fields to documents
 * @property {{[key: string]: 1 | -1}} [$sort] - MongoDB $sort stage for sorting documents
 * @property {number} [$skip] - MongoDB $skip stage for pagination
 * @property {number} [$limit] - MongoDB $limit stage for limiting results
 */

/**
 * @import { AggregateOptions, CollationOptions } from 'mongodb'
 */
