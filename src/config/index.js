import { cwd } from 'process'

import 'dotenv/config'
import convict from 'convict'

export const config = convict({
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 3001,
    env: 'PORT'
  },
  serviceName: {
    doc: 'Api Service Name',
    format: String,
    default: 'forms-manager'
  },
  root: {
    doc: 'Project root',
    format: String,
    default: cwd()
  },
  appPathPrefix: {
    doc: 'Application url path prefix',
    format: String,
    default: '/forms-manager'
  },
  isProduction: {
    doc: 'If this application running in the production environment',
    format: Boolean,
    default: process.env.NODE_ENV === 'production'
  },
  isDevelopment: {
    doc: 'If this application running in the development environment',
    format: Boolean,
    default: process.env.NODE_ENV !== 'production'
  },
  isTest: {
    doc: 'If this application running in the test environment',
    format: Boolean,
    default: process.env.NODE_ENV === 'test'
  },
  logLevel: {
    doc: 'Logging level',
    format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
    default: 'info',
    env: 'LOG_LEVEL'
  },
  mongoUri: {
    doc: 'URI for mongodb',
    format: '*',
    default: 'mongodb://127.0.0.1:27017/',
    env: 'MONGO_URI'
  },
  mongoDatabase: {
    doc: 'database for mongodb',
    format: String,
    default: 'forms-manager',
    env: 'MONGO_DATABASE'
  },
  httpProxy: {
    doc: 'HTTP Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'CDP_HTTP_PROXY'
  },
  httpsProxy: {
    doc: 'HTTPS Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'CDP_HTTPS_PROXY'
  },
  formDirectory: {
    doc: 'Directory on disk to store the forms',
    format: String,
    nullable: false,
    default: 'forms',
    env: 'FORMS_DIRECTORY'
  },
  formDefinitionBucketName: {
    // confict requires a default value, for some reason. setting as nullable so we can check it at runtime.
    doc: 'Name of the S3 bucket hosting the form definitions',
    format: String,
    nullable: true,
    default: null,
    env: 'FORM_DEF_BUCKET_NAME'
  },
  s3Region: {
    doc: 'S3 region for the app on CDP',
    format: String,
    nullable: false,
    default: 'us-west-2',
    env: 'S3_REGION'
  },
  // isUsingCloudEmulation: {
  //   doc: 'If true, turns on cloud emulation for local development (e.g. Localstack)',
  //   format: Boolean,
  //   default: false,
  //   env: 'EMULATE_CLOUD'
  // },
  s3Endpoint: {
    doc: 'If true, uses an alternative S3 endpoint (e.g. local development)',
    format: String,
    default: '',
    nullable: true,
    env: 'S3_ENDPOINT'
  }
})

config.validate({ allowed: 'strict' })
