/**
 * @typedef {object} FilterConditions
 * @property {{ $regex: RegExp }} [title] - Optional MongoDB regex query for title matching
 * @property {{ $regex: RegExp }} [createdBy.displayName] - Optional MongoDB regex query for author matching
 * @property {{ $in: string[] }} [organisation] - Optional MongoDB $in query for organisation matching
 * @property {{ live: { $exists: boolean } }[]} [$or] - Optional MongoDB $or query for status matching
 */

/**
 * @typedef {SearchOptions & { title?: string }} FilterQuery
 */

/**
 * @typedef {object} FilterAggregationResult
 * @property {{ name: string }[]} authors - Array of author names
 * @property {{ name: string }[]} organisations - Array of organisation names
 * @property {[{ statuses: FormStatus[] }]} status - Array containing status values
 */

/**
 * @typedef {object} RegexMatch
 * @property {string} input - Input string to match against
 * @property {string} regex - Regular expression pattern
 * @property {string} options - Regex options (e.g., 'i' for case-insensitive)
 */

/**
 * @typedef {object} SwitchCase
 * @property {[{ $toLower: string } | string, string]} [$eq] - Equality comparison condition
 * @property {RegexMatch} [$regexMatch] - Regular expression matching condition
 */

/**
 * @typedef {object} SwitchBranch
 * @property {SwitchCase} case - Condition to evaluate
 * @property {number} then - Value to return if condition is true
 */

/**
 * @typedef {object} SwitchExpression
 * @property {SwitchBranch[]} branches - Array of condition-value pairs
 * @property {number} default - Default value if no conditions match
 */

/**
 * @typedef {object} AddFieldsSwitch
 * @property {SwitchExpression} $switch - MongoDB $switch expression
 */

/**
 * @typedef {object} DateToStringExpression
 * @property {string} format - Date format string
 * @property {string} date - Date field or expression
 * @property {string} timezone - Timezone for date conversion
 */

/**
 * @typedef {object} AddFieldValue
 * @property {DateToStringExpression} [$dateToString] - MongoDB $dateToString expression
 * @property {SwitchExpression} [$switch] - MongoDB $switch expression
 */

/**
 * @typedef {{[key: string]: number | AddFieldValue}} AddFieldsStage
 */

/**
 * @typedef {object} PipelineStage
 * @property {FilterConditions} [$match] - MongoDB $match stage
 * @property {AddFieldsStage} [$addFields] - MongoDB $addFields stage
 * @property {{ [key: string]: 1 | -1 }} [$sort] - MongoDB $sort stage
 * @property {number} [$skip] - MongoDB $skip stage
 * @property {number} [$limit] - MongoDB $limit stage
 * @property {{ [key: string]: PipelineStage[] }} [$facet] - MongoDB $facet stage
 * @property {{ _id: string | null | object, [key: string]: any }} [$group] - MongoDB $group stage
 * @property {{ [key: string]: 0 | 1 | string }} [$project] - MongoDB $project stage
 */

/**
 * @import { SearchOptions, FormStatus } from '@defra/forms-model'
 */
