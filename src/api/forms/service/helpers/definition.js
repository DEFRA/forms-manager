import { formDefinitionSchema } from '@defra/forms-model'

import { InvalidFormDefinitionError } from '~/src/api/forms/errors.js'
import { logger } from '~/src/api/forms/service/shared.js'

/**
 * Creates an object of keys and their desired position based on the pageOrder (pure function)
 * For ['a', 'b', 'c'] will return { a: -2, b: -1, c: -0 }
 * @param {string[]} pageOrder
 * @returns {PageOrderHelper}
 */
export function createOrder(pageOrder) {
  return pageOrder
    .slice()
    .reverse()
    .reduce((pageOrderChart, id, idx) => {
      return {
        ...pageOrderChart,
        [id]: -idx
      }
    }, {})
}

/**
 * Re-orders the pages in the definition
 * @param {FormDefinition} formDefinition
 * @param {string[]} pageOrder
 */
export function reorderPages(formDefinition, pageOrder) {
  const order = createOrder(pageOrder)

  return {
    ...formDefinition,
    pages: formDefinition.pages.toSorted((pageA, pageB) => {
      const aId = pageA.id
      const bId = pageB.id

      const aPosition = aId !== undefined && aId in order ? order[aId] : 0
      const bPosition = bId !== undefined && bId in order ? order[bId] : 0

      if (aPosition < bPosition) {
        return -1
      }

      if (aPosition > bPosition) {
        return 1
      }

      return 0
    })
  }
}

/**
 * Validates the form definition
 * @param {FormDefinition} definition
 */
export function validate(definition) {
  const { error } = formDefinitionSchema.validate(definition)

  if (error) {
    const name = definition.name ?? 'No name'

    logger.warn(
      `Form failed validation: '${error.message}'. Form name: '${name}'`
    )

    throw new InvalidFormDefinitionError(name, {
      cause: error
    })
  }
}

/**
 * @typedef {{
 *     [k: string]: number
 * }} PageOrderHelper
 */

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
