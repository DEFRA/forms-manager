import { cwd } from 'process'

import 'dotenv/config'
import convict from 'convict'

const isProduction = process.env.NODE_ENV === 'production'
const isDev = process.env.NODE_ENV !== 'production'
const isTest = process.env.NODE_ENV === 'test'

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
  serviceVersion: /** @satisfies {SchemaObj<string>} */ ({
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    nullable: true,
    default: null,
    env: 'SERVICE_VERSION'
  }),
  root: {
    doc: 'Project root',
    format: String,
    default: cwd()
  },
  isProduction: {
    doc: 'If this application running in the production environment',
    format: Boolean,
    default: isProduction
  },
  isDevelopment: {
    doc: 'If this application running in the development environment',
    format: Boolean,
    default: isDev
  },
  isTest: {
    doc: 'If this application running in the test environment',
    format: Boolean,
    default: isTest
  },
  log: {
    enabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: !isTest,
      env: 'LOG_ENABLED'
    },
    level: /** @type {SchemaObj<LevelWithSilent>} */ ({
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'info',
      env: 'LOG_LEVEL'
    }),
    format: /** @type {SchemaObj<'ecs' | 'pino-pretty'>} */ ({
      doc: 'Format to output logs in.',
      format: ['ecs', 'pino-pretty'],
      default: isProduction ? 'ecs' : 'pino-pretty',
      env: 'LOG_FORMAT'
    }),
    redact: {
      doc: 'Log paths to redact',
      format: Array,
      default: isProduction
        ? ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
        : ['req', 'res', 'responseTime']
    }
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
    default: '',
    env: 'CDP_HTTP_PROXY'
  },
  httpsProxy: {
    doc: 'HTTPS Proxy',
    format: String,
    default: '',
    env: 'CDP_HTTPS_PROXY'
  },
  /**
   * @todo We plan to replace `node-convict` with `joi` and remove all defaults.
   * These OIDC/roles are for the DEV application in the DEFRA tenant.
   */
  oidcJwksUri: {
    doc: 'The URI that defines the OIDC json web key set',
    format: String,
    default:
      'https://login.microsoftonline.com/770a2450-0227-4c62-90c7-4e38537f1102/discovery/v2.0/keys',
    env: 'OIDC_JWKS_URI'
  },
  oidcVerifyAud: {
    doc: 'The audience used for verifying the OIDC JWT',
    format: String,
    default: 'ec32e5c5-75fa-460a-a359-e3e5a4a8f10e',
    env: 'OIDC_VERIFY_AUD'
  },
  oidcVerifyIss: {
    doc: 'The issuer used for verifying the OIDC JWT',
    format: String,
    default:
      'https://login.microsoftonline.com/770a2450-0227-4c62-90c7-4e38537f1102/v2.0',
    env: 'OIDC_VERIFY_ISS'
  },
  roleEditorGroupId: {
    doc: 'The AD security group the access token needs to claim membership of',
    format: String,
    default: '9af646c4-fa14-4606-8ebf-ec187ac03386',
    env: 'ROLE_EDITOR_GROUP_ID'
  }
})

config.validate({ allowed: 'strict' })

/**
 * @import { SchemaObj } from 'convict'
 * @import { LevelWithSilent } from 'pino'
 */
