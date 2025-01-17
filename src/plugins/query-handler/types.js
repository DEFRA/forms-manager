/**
 * @template T The type of items in the array
 * @typedef {object} QueryHandlerToolkit<T>
 * @property {function(Array<T>, number, QueryOptions, FilterOptions): QueryResult<T>} queryResponse - Creates a standardised response with pagination, sorting, and search metadata
 */

/**
 * @template T
 * @typedef {ResponseToolkit & QueryHandlerToolkit<T>} ExtendedResponseToolkit
 */

/**
 * @typedef {object} QueryHandlerPlugin
 * @property {string} name - The name of the plugin
 * @property {(server: Server, options?: QueryHandlerOptions) => void | Promise<void>} register - Function to register the plugin with the server
 */

/**
 * @typedef {object} QueryHandlerOptions
 * @property {PaginationOptions} pagination - Options for configuring pagination behavior
 * @property {SortingOptions} sorting - Options for configuring sorting behavior
 * @property {SearchOptions} search - Options for configuring search behavior
 */

/**
 * @import { QueryOptions, QueryResult, PaginationOptions, SortingOptions, SearchOptions, FilterOptions } from '@defra/forms-model'
 * @import { ResponseToolkit, Server } from '@hapi/hapi'
 */
