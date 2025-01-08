/**
 * @typedef {object} QueryHandlerToolkit
 * @property {function(Array<*>, number, QueryOptions): QueryResult<*>} queryResponse - Creates a standardised response with pagination, sorting, and search metadata
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
 * @typedef {ResponseToolkit & QueryHandlerToolkit} ExtendedResponseToolkit
 */

/**
 * @import { QueryOptions, QueryResult, PaginationOptions, SortingOptions, SearchOptions } from '@defra/forms-model'
 * @import { ResponseToolkit, Server } from '@hapi/hapi'
 */
