/* eslint-disable */
// In this file you can configure migrate-mongo
require('dotenv/config')

const config = {
  mongodb: {
    // Use environment variables to match the app's configuration
    url: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/',

    // Use the same database name as the app
    databaseName: process.env.MONGO_DATABASE || 'forms-manager',

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
  migrationFileExtension: '.cjs',

  // Enable the algorithm to create a checksum of the file contents and use that in the comparison to determine
  // if the file should be run.  Requires that scripts are coded to be run multiple times.
  useFileHash: false,

  // Don't change this, unless you know what you're doing
  moduleSystem: 'commonjs'
}

module.exports = config
