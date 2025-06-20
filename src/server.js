import { createServer } from '~/src/api/server.js'
import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/helpers/logging/logger.js'

const logger = createLogger()

process.on('unhandledRejection', (error) => {
  logger.error(
    `[unhandledRejection] Unhandled rejection - ${error instanceof Error ? error.message : String(error)}`
  )
  throw error
})

/**
 * Starts the server.
 */
export async function listen() {
  const server = await createServer()
  await server.start()

  server.logger.info('Server started successfully')
  server.logger.info(
    `Access your backend on http://localhost:${config.get('port')}`
  )
}
