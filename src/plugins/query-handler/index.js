import { defaultConfig } from '~/src/plugins/query-handler/config.js'

/** @satisfies {ServerRegisterPluginObject<void>} */
export const queryHandler = {
  plugin: {
    name: 'queryHandler',
    register(server) {
      server.decorate(
        'toolkit',
        'queryResponse',
        /**
         * @param {Array<*>} data
         * @param {number} totalItems
         * @param {QueryOptions} [options]
         * @returns {QueryResult<*>}
         */
        function (data, totalItems, options) {
          const defaults = {
            page: defaultConfig.pagination.page,
            perPage: defaultConfig.pagination.perPage,
            sortBy: defaultConfig.sorting.sortBy,
            order: defaultConfig.sorting.order,
            title: defaultConfig.search.title
          }

          const { page, perPage, sortBy, order, title } = {
            ...defaults,
            ...options
          }

          return {
            data,
            meta: {
              pagination: {
                page,
                perPage,
                totalItems,
                totalPages: Math.ceil(totalItems / perPage)
              },
              sorting: {
                sortBy,
                order
              },
              search: {
                title
              }
            }
          }
        }
      )
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 * @import { QueryOptions, QueryResult } from '@defra/forms-model'
 */
