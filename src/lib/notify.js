import { token } from '@hapi/jwt'

import { config } from '~/src/config/index.js'
import { postJson } from '~/src/lib/fetch.js'

const notifyAPIKey = config.get('notifyAPIKey')

const API_KEY_SUBSTRING_REDUCTION = 36
const SERVICE_ID_SUBSTRING_REDUCTION = 73
const SERVICE_ID_SUBSTRING_REDUCTION_2 = 37

// Extract the two uuids from the notifyApiKey
// See https://github.com/alphagov/notifications-node-client/blob/main/client/api_client.js#L17
// Needed until `https://github.com/alphagov/notifications-node-client/pull/200` is published
const apiKeyId = /** @type {string} */ (
  notifyAPIKey.substring(
    notifyAPIKey.length - API_KEY_SUBSTRING_REDUCTION,
    notifyAPIKey.length
  )
)
const serviceId = /** @type {string} */ (
  notifyAPIKey.substring(
    notifyAPIKey.length - SERVICE_ID_SUBSTRING_REDUCTION,
    notifyAPIKey.length - SERVICE_ID_SUBSTRING_REDUCTION_2
  )
)

/**
 * @typedef {{
 *   templateId: string
 *   emailAddress: string
 *   personalisation: { subject: string; body: string }
 *   notifyReplyToId?: string
 * }} SendNotificationArgs
 */

/**
 * Advanced escape function for Markdown content with the following rules:
 * - A `-` or `*` or `#` character at the start of a line (ignoring leading whitespace) is escaped with a backslash.
 * - A number immediately followed by a period at the start of a line (ignoring leading whitespace) has the period escaped with a backslash (e.g., `1.` becomes `1\.`).
 * - Tab characters are replaced with 4 HTML encoded spaces (`&nbsp;`).
 * - A `-` character surrounded by spaces or tabs has those spaces or tabs replaced with HTML encoded spaces (`&nbsp;`).
 * - ``` being the only content on a single line is replaced with ` ` `
 * - Where a period `.` or comma `,` has a leading space or tab character, the space is converted to `&nbsp;` and tabs to 4 `&nbsp;`.
 * - Where a Markdown link is present (`[text](url)`), a space is inserted between the square brackets and round brackets.
 * - Single quotes (`'`) and double quotes (`"`) are escaped with a backslash (first escaping any backslashes that would be escape characters for the quotes).
 *
 * WARNING: This function has limitations and may not cover all edge cases for Notify. One known limitation is that it does not handle multiple backslashes preceding quotes
 * because to do so would add complexity and Notify only supports up to 2 consecutive backslashes before quotes without formating issues.
 *
 * NOTE: When escaping the backslash in `\'` for Notify, it needs to be escaped with an additional two backslashes, because Notify treats `\\'` the same as `\'` which results
 * in no backslash in the final output.
 * @param {string} str - Gracefully handles null, undefined and non-string values.
 * @returns {string}
 */
export function escapeContent(str) {
  if (typeof str !== 'string') {
    return ''
  }

  // Process line by line to handle start-of-line rules
  const lines = str.split('\n')
  const processedLines = lines.map((line) => {
    // Rule: ``` being the only content on a single line is replaced with ` ` `
    if (line.trim() === '```') {
      return line.replace('```', '` ` `')
    }

    // Rule: A `-` or `*` or `#` character at the start of a line (allowing leading whitespace) is escaped with a backslash
    let processedLine = line.replace(/^([ \t]*)([-*#])/, String.raw`$1\$2`)

    // Rule: A number immediately followed by a period at the start of a line (allowing leading whitespace) has the period escaped
    processedLine = processedLine.replace(
      /^([ \t]*)(\d+)\./,
      String.raw`$1$2\.`
    )

    return processedLine
  })

  let result = processedLines.join('\n')

  // Rule: Tab characters are replaced with 4 HTML encoded spaces
  // (Must be done before the hyphen-surrounded-by-whitespace rule)
  result = result.replaceAll('\t', '&nbsp;&nbsp;&nbsp;&nbsp;')

  // Rule: A `-` character surrounded by spaces or tabs has the immediate spaces or tabs replaced with &nbsp;
  // Since tabs are already converted, we now handle spaces around hyphens
  // Prevents conversion to en-dash
  result = result.replaceAll(' - ', '&nbsp;-&nbsp;')

  // Rule: Where a period `.` or comma `,` has a leading space or tab character,
  // the space is converted to &nbsp; (tabs already converted above)
  result = result.replaceAll(/ ([.,])/g, '&nbsp;$1')

  // Rule: Where a Markdown link is present, insert space between ] and (
  // Match [text](url) pattern and convert to [text] (url)
  // Also handle HTML entity encoded brackets: &rsqb; (]) and &lpar; (()
  result = result.replaceAll(/](\()/g, '] (')
  result = result.replaceAll(/&rsqb;(&lpar;)/gi, '&rsqb; &lpar;')

  // Rule: Single and double quotes are escaped with a backslash, but escape backslashes that would be escape characters first.
  result = result.replaceAll("\\'", String.raw`\\\\'`)
  result = result.replaceAll('\\"', String.raw`\\\\"`)
  result = result.replaceAll("'", String.raw`\'`)
  result = result.replaceAll('"', String.raw`\"`)

  return result
}

/**
 * @param {string} iss
 * @param {string} secret
 */
function createToken(iss, secret) {
  const iat = Math.round(Date.now() / 1000)

  return token.generate({ iss, iat }, secret, {
    header: { typ: 'JWT', alg: 'HS256' }
  })
}

const NOTIFICATIONS_URL = new URL(
  '/v2/notifications/email',
  'https://api.notifications.service.gov.uk'
)

/**
 * @param {SendNotificationArgs} args
 * @returns {Promise<{response: object, body: unknown}>}
 */
export async function sendNotification(args) {
  const { templateId, emailAddress, personalisation, notifyReplyToId } = args

  return postJson(NOTIFICATIONS_URL, {
    payload: {
      template_id: templateId,
      email_address: emailAddress,
      personalisation,
      email_reply_to_id: notifyReplyToId
    },
    headers: {
      Authorization: 'Bearer ' + createToken(serviceId, apiKeyId)
    }
  })
}
