import { MAX_RESULTS } from '~/src/api/forms/repositories/form-metadata-repository.js'

/** @satisfies {QueryHandlerOptions} */
export const defaultConfig = {
  pagination: {
    page: 1,
    perPage: MAX_RESULTS
  },
  sorting: {
    sortBy: 'updatedAt',
    order: 'desc'
  },
  search: {
    title: '',
    author: '',
    organisations: [],
    status: []
  }
}

/**
 * @import { QueryHandlerOptions } from '~/src/plugins/query-handler/types.js'
 */
