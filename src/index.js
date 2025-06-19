import { chdir } from 'node:process'

import { normaliseError } from '~/src/helpers/error-utils.js'
import { createLogger } from '~/src/helpers/logging/logger.js'

const logger = createLogger()

// Move working directory to build output
chdir(import.meta.dirname)

import('~/src/server.js')
  .then((server) => server.listen())
  .catch((/** @type {unknown} */ error) => {
    const err = normaliseError(error, 'Unknown startup error')
    logger.info('Server failed to start :(')
    logger.error(err, `[serverStartup] Server failed to start: ${err.message}`)
    throw error
  })
