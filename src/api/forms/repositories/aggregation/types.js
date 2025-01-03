/**
 * @typedef {object} FilterConditions
 * @property {{ $regex: RegExp }} [title] - Optional MongoDB regex query for title matching
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
 * @property {FilterConditions} [$match] - MongoDB $match stage for filtering documents
 * @property {AddFieldsStage} [$addFields] - MongoDB $addFields stage for adding computed fields to documents
 * @property {{ [key: string]: 1 | -1 }} [$sort] - MongoDB $sort stage for sorting documents
 * @property {number} [$skip] - MongoDB $skip stage for pagination
 * @property {number} [$limit] - MongoDB $limit stage for limiting results
 */
