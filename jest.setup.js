process.env.NODE_ENV = 'test'
process.env.HOST = '0.0.0.0'
process.env.PORT = '3001'
process.env.SERVICE_VERSION = 'test'

process.env.LOG_ENABLED = 'false'
process.env.LOG_LEVEL = 'debug'
process.env.LOG_FORMAT = 'pino-pretty'

process.env.MONGO_URI =
  'mongodb://localhost:27017/?replicaSet=rs0&directConnection=true&readPreference=secondaryPreferred'
process.env.MONGO_DATABASE = 'forms-manager'

process.env.HTTP_PROXY = ''
process.env.CDP_HTTPS_PROXY = ''

process.env.ENABLE_SECURE_CONTEXT = 'false'
process.env.ENABLE_METRICS = 'false'
process.env.TRACING_HEADER = 'x-cdp-request-id'

process.env.OIDC_JWKS_URI =
  'http://localhost:5556/.well-known/openid-configuration/jwks'
process.env.OIDC_VERIFY_AUD = 'local-test-client'
process.env.OIDC_VERIFY_ISS = 'http://oidc:80'
process.env.ROLE_EDITOR_GROUP_ID = '5b8a0214-74d3-4bf0-b665-102511c967b2'

process.env.AWS_REGION = 'eu-west-2'
process.env.SNS_ENDPOINT = 'http://localhost:4566'
process.env.SNS_TOPIC_ARN =
  'arn:aws:sns:eu-west-2:000000000000:forms_manager_events'
process.env.FEATURE_FLAG_PUBLISH_AUDIT_EVENTS = 'false'

process.env.S3_ENDPOINT = 'http://localhost:4566'
process.env.FORM_DEF_BUCKET_NAME = 'form-definition-storage'

process.env.ENTITLEMENT_URL = 'http://localhost:3004'
process.env.FEATURE_FLAG_USE_ENTITLEMENT_API = 'false'

process.env.PUBLIC_KEY_FOR_SECRETS = 'test-public-key'
