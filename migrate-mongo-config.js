import 'dotenv/config'
// eslint-disable-next-line no-restricted-imports -- we're not running this via babel so can't use tilde imports
import { prepareSecureContext } from './src/secure-context.js'

// Prepare secure context for MongoDB TLS connections
prepareSecureContext(console.log) // eslint-disable-line no-console

if (!process.env.MONGO_URI) {
  throw new Error('Missing required environment variable: MONGO_URI')
}
if (!process.env.MONGO_DATABASE) {
  throw new Error('Missing required environment variable: MONGO_DATABASE')
}

const config = {
  mongodb: {
    url: process.env.MONGO_URI,
    databaseName: process.env.MONGO_DATABASE,
    options: {
      //   connectTimeoutMS: 3600000, // increase connection timeout to 1 hour
      //   socketTimeoutMS: 3600000, // increase socket timeout to 1 hour
    }
  },

  // The migrations dir, can be an relative or absolute path. Only edit this when really necessary.
  migrationsDir: 'migrations',

  // The mongodb collection where the applied changes are stored. Only edit this when really necessary.
  changelogCollectionName: 'changelog',

  // The mongodb collection where the lock will be created.
  lockCollectionName: 'changelog_lock',

  // The value in seconds for the TTL index that will be used for the lock. Value of 0 will disable the feature.
  lockTtl: 0,

  // The file extension to create migrations and search for in migration dir
  migrationFileExtension: '.js',

  // Enable the algorithm to create a checksum of the file contents and use that in the comparison to determine
  // if the file should be run.  Requires that scripts are coded to be run multiple times.
  useFileHash: false,

  // Don't change this, unless you know what you're doing
  moduleSystem: 'esm'
}

export default config
