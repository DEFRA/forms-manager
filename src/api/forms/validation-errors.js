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
 * Return the matchPath and errorPaths to use in matches
 * @param {ValidationErrorItem} error
 * @param {ErrorMatchValue} match
 * @param {ErrorMatchPath} [errorPathPrefix] - the error path prefix to use for non-root errors
 * @returns
 */
function getPaths(error, match, errorPathPrefix) {
  return {
    matchPath: match.path,
    errorPath: errorPathPrefix
      ? [...errorPathPrefix, ...error.path]
      : error.path
  }
}

/**
 * Returns true if the joi error matches our FormDefinitionErrors
 * @param {ValidationErrorItem} error
 * @param {ErrorMatchValue} match
 * @param {ErrorMatchPath} [errorPathPrefix] - the error path prefix to use for non-root errors
 */
function matches(error, match, errorPathPrefix) {
  const { matchPath, errorPath } = getPaths(error, match, errorPathPrefix)

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
 * @returns {FormDefinitionErrorCause[]}
 */
export function getCauses(validationError, errorPathPrefix) {
  return (
    validationError?.details.map((detail) => {
      if (detail.type === 'array.unique') {
        const match = uniqueErrorEntries.find(([, value]) => {
          return matches(detail, value, errorPathPrefix)
        })

        if (match) {
          const [key] = match

          return {
            id: /** @type {FormDefinitionError} */ (key),
            type: FormDefinitionErrorType.Unique,
            message: detail.message,
            detail: {
              path: detail.path,
              pos: detail.context?.pos,
              dupePos: detail.context?.dupePos
            }
          }
        }
      }

      if (detail.type === 'any.only') {
        const match = refErrorEntries.find(([, value]) => {
          return matches(detail, value, errorPathPrefix)
        })

        if (match) {
          const [key] = match

          return {
            id: /** @type {FormDefinitionError} */ (key),
            type: FormDefinitionErrorType.Ref,
            message: detail.message,
            detail: {
              path: detail.path
            }
          }
        }
      }

      // Catch all others
      return {
        id: FormDefinitionError.Other,
        type: FormDefinitionErrorType.Type,
        message: detail.message,
        detail: detail.context
      }
    }) ?? []
  )
}

/**
 * @import { ValidationError, ValidationErrorItem } from 'joi'
 * @import { FormDefinitionErrorCause, ErrorMatchPath, ErrorMatchValue } from '@defra/forms-model'
 */
