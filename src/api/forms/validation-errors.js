import {
  FormDefinitionError,
  FormDefinitionErrorType,
  N,
  formDefinitionErrors
} from '@defra/forms-model'

const errorEntries = Object.entries(formDefinitionErrors)
const uniqueErrorEntries = errorEntries.filter(
  ([, value]) => value.type === FormDefinitionErrorType.Unique
)
const refErrorEntries = errorEntries.filter(
  ([, value]) => value.type === FormDefinitionErrorType.Ref
)

/**
 * Returns true if the joi error matches our FormDefinitionErrors
 * @param {ValidationErrorItem} error
 * @param {ErrorMatchValue} match
 * @param {ErrorMatchPath} [errorPathPrefix] - the error path prefix to use for non-root errors
 */
export function matches(error, match, errorPathPrefix) {
  const errorPath = errorPathPrefix
    ? [...errorPathPrefix, ...error.path]
    : error.path
  const matchPath = match.path

  if (!error.context) {
    return false
  }

  const context = error.context

  if (matchPath.length !== errorPath.length) {
    return false
  }

  // Joi's `context.key` will be the index for arrays
  // in which case use the path, otherwise use the key
  const keyMatch = typeof context.key === 'number' ? context.path : context.key

  if (match.key !== keyMatch) {
    return false
  }

  for (let index = 0; index < matchPath.length; index++) {
    const matchItem = matchPath[index]
    if (matchItem === N) {
      if (!(errorPath[index] === N || typeof errorPath[index] === 'number')) {
        return false
      }
    } else if (matchItem !== errorPath[index]) {
      return false
    } else {
      continue
    }
  }

  return true
}

/**
 * Get the error causes from a form definition joi validation error
 * @param {ValidationError} [validationError] - the form definition error
 * @param {ErrorMatchPath} [errorPathPrefix] - the match path prefix to use for non-root errors
 */
export function getCauses(validationError, errorPathPrefix) {
  /** @type {FormDefinitionErrorCause[]} */
  const causes = []

  /**
   * Matches joi validation errror detail
   * @param {ValidationErrorItem} detail
   */
  function matchDetail(detail) {
    if (detail.type === 'array.unique') {
      const match = uniqueErrorEntries.find(([, value]) => {
        return matches(detail, value, errorPathPrefix)
      })

      if (match) {
        const [key] = match

        causes.push({
          id: /** @type {FormDefinitionError} */ (key),
          type: FormDefinitionErrorType.Unique,
          message: detail.message,
          detail: {
            path: detail.path,
            pos: detail.context?.pos,
            dupePos: detail.context?.dupePos
          }
        })
      }
    } else if (detail.type === 'any.only') {
      const match = refErrorEntries.find(([, value]) => {
        return matches(detail, value, errorPathPrefix)
      })

      if (match) {
        const [key] = match

        causes.push({
          id: /** @type {FormDefinitionError} */ (key),
          type: FormDefinitionErrorType.Ref,
          message: detail.message,
          detail: {
            path: detail.path
          }
        })
      }
    } else {
      // Catch all
      // Unlikely to end here as any other errors should have
      // been screened out in the payload validation of the endpoint
      causes.push({
        id: FormDefinitionError.Other,
        type: FormDefinitionErrorType.Type,
        message: detail.message,
        detail: detail.context
      })
    }
  }

  // Search in top level details
  validationError?.details.forEach(matchDetail)

  return causes
}

/**
 * @import { ValidationError, ValidationErrorItem } from 'joi'
 * @import { FormDefinitionErrorCause, ErrorMatchPath, ErrorMatchValue } from '@defra/forms-model'
 */
