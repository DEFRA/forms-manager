import { cwd } from 'node:process'

import 'dotenv/config'
import convict from 'convict'

const isProduction = process.env.NODE_ENV === 'production'
const isDev = process.env.NODE_ENV !== 'production'
const isTest = process.env.NODE_ENV === 'test'

export const config = convict({
  /**@type {SchemaObj<string>} */
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: null,
    env: 'NODE_ENV'
  },
  /**@type {SchemaObj<string>} */
  host: {
    doc: 'The IP address to bind',
    format: String,
    default: null,
    env: 'HOST'
  },
  /**@type {SchemaObj<number>} */
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: null,
    env: 'PORT'
  },
  /**@type {SchemaObj<string>} */
  serviceName: {
    doc: 'Api Service Name',
    format: String,
    default: 'forms-manager'
  },
  serviceVersion: /** @satisfies {SchemaObj<string | null>} */ ({
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    default: null,
    env: 'SERVICE_VERSION'
  }),
  /**@type {SchemaObj<string>} */
  root: {
    doc: 'Project root',
    format: String,
    default: cwd()
  },
  /**@type {SchemaObj<Boolean>} */
  isProduction: {
    doc: 'If this application running in the production environment',
    format: Boolean,
    default: isProduction
  },
  /**@type {SchemaObj<Boolean>} */
  isDevelopment: {
    doc: 'If this application running in the development environment',
    format: Boolean,
    default: isDev
  },
  /**@type {SchemaObj<Boolean>} */
  isTest: {
    doc: 'If this application running in the test environment',
    format: Boolean,
    default: isTest
  },
  log: {
    /**@type {SchemaObj<Boolean>} */
    enabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: null,
      env: 'LOG_ENABLED'
    },
    level: /** @type {SchemaObj<LevelWithSilent>} */ ({
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: null,
      env: 'LOG_LEVEL'
    }),
    format: /** @type {SchemaObj<'ecs' | 'pino-pretty'>} */ ({
      doc: 'Format to output logs in.',
      format: ['ecs', 'pino-pretty'],
      default: null,
      env: 'LOG_FORMAT'
    }),
    /**@type {SchemaObj<string[]>} */
    redact: {
      doc: 'Log paths to redact',
      format: Array,
      default: isProduction
        ? ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
        : ['req', 'res', 'responseTime']
    }
  },
  mongo: {
    /** @type {SchemaObj<string>} */
    uri: {
      doc: 'URI for mongodb',
      format: String,
      default: null,
      env: 'MONGO_URI'
    },
    /** @type {SchemaObj<string>} */
    databaseName: {
      doc: 'Database name for mongodb',
      format: String,
      default: null,
      env: 'MONGO_DATABASE'
    }
  },
  /** @type {SchemaObj<string>} */
  httpProxy: {
    doc: 'HTTP Proxy',
    format: String,
    default: null,
    env: 'HTTP_PROXY'
  },
  /** @type {SchemaObj<string>} */
  httpsProxy: {
    doc: 'HTTPS Proxy',
    format: String,
    default: null,
    env: 'CDP_HTTPS_PROXY'
  },
  /** @type {SchemaObj<boolean>} */
  isSecureContextEnabled: {
    doc: 'Enable Secure Context',
    format: Boolean,
    default: null,
    env: 'ENABLE_SECURE_CONTEXT'
  },
  /** @type {SchemaObj<boolean>} */
  isMetricsEnabled: {
    doc: 'Enable metrics reporting',
    format: Boolean,
    default: null,
    env: 'ENABLE_METRICS'
  },
  /*
   * These OIDC/roles are for the DEV application in the DEFRA tenant.
   */
  /** @type {SchemaObj<string>} */
  oidcJwksUri: {
    doc: 'The URI that defines the OIDC json web key set',
    format: String,
    default: null,
    env: 'OIDC_JWKS_URI'
  },
  /** @type {SchemaObj<string>} */
  oidcVerifyAud: {
    doc: 'The audience used for verifying the OIDC JWT',
    format: String,
    default: null,
    env: 'OIDC_VERIFY_AUD'
  },
  /** @type {SchemaObj<string>} */
  oidcVerifyIss: {
    doc: 'The issuer used for verifying the OIDC JWT',
    format: String,
    default: null,
    env: 'OIDC_VERIFY_ISS'
  },
  tracing: {
    /** @type {SchemaObj<string>} */

    header: {
      doc: 'CDP tracing header name',
      format: String,
      default: 'x-cdp-request-id',
      env: 'TRACING_HEADER'
    }
  },
  /** @type {SchemaObj<string>} */
  awsRegion: {
    doc: 'AWS region',
    format: String,
    default: null,
    env: 'AWS_REGION'
  },
  /** @type {SchemaObj<string>} */
  snsEndpoint: {
    doc: 'The SNS endpoint, if required (e.g. a local development dev service)',
    format: String,
    default: null,
    env: 'SNS_ENDPOINT'
  },
  /** @type {SchemaObj<string>} */
  snsTopicArn: {
    doc: 'SNS topic ARN',
    format: String,
    default: null,
    env: 'SNS_TOPIC_ARN'
  },
  /** @type {SchemaObj<boolean>} */
  publishAuditEvents: {
    doc: 'Publish audit events for forms-audit-api',
    format: Boolean,
    default: null,
    env: 'FEATURE_FLAG_PUBLISH_AUDIT_EVENTS'
  },
  /** @type {SchemaObj<string>} */
  s3Endpoint: {
    doc: 'The S3 HTTP(S) endpoint, if required (e.g. a local development dev service). Activating this will force path style addressing for compatibility with Localstack.',
    format: String,
    default: null,
    env: 'S3_ENDPOINT'
  },
  /** @type {SchemaObj<string>} */
  s3Bucket: {
    doc: 'S3 bucket name',
    format: String,
    default: null,
    env: 'FORM_DEF_BUCKET_NAME'
  },
  /** @type {SchemaObj<string>} */
  entitlementUrl: {
    doc: 'Forms entitlements API URL',
    format: String,
    default: null,
    env: 'ENTITLEMENT_URL'
  },
  /** @type {SchemaObj<string>} */
  publicKeyForSecrets: {
    doc: 'Public key for encryption of secrets',
    format: String,
    default: null,
    env: 'PUBLIC_KEY_FOR_SECRETS'
  }
})

config.validate({ allowed: 'strict' })

/**
 * @import { SchemaObj } from 'convict'
 * @import { LevelWithSilent } from 'pino'
 */
