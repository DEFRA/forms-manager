import { join } from 'node:path'

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3'

import { FailedToReadFormError } from './errors.js'

import { config } from '~/src/config/index.js'

const formDirectory = config.get('formDirectory')
const s3Region = config.get('s3Region')
const formBucketName = /** @type {string | null} */ (
  config.get('formDefinitionBucketName')
)

const s3Client = new S3Client({
  region: s3Region,
  ...(config.get('s3Endpoint') ? { endpoint: config.get('s3Endpoint') } : {})
})

/**
 * Gets a filename for a given form ID
 * @param {string} formId - the form ID
 * @returns - the path to the form definition file
 */
function getFormDefinitionFilename(formId) {
  return join(formDirectory, `${formId}.json`)
}

/**
 * Adds a form to the Form Store
 * @param {import('../types.js').FormConfiguration} formConfiguration - form configuration
 * @param {object} formDefinition - form definition (JSON object)
 */
export async function create(formConfiguration, formDefinition) {
  const formDefinitionFilename = getFormDefinitionFilename(formConfiguration.id)

  // Convert formMetadata to JSON string
  const formDefinitionString = JSON.stringify(formDefinition)

  // Write formDefinition to file
  await uploadToS3(formDefinitionFilename, formDefinitionString)
}

/**
 * Retrieves the form definition for a given form ID
 * @param {string} formId - the ID of the form
 * @returns {Promise<string>} - form definition JSON content
 */
export function get(formId) {
  return retrieveFromS3(getFormDefinitionFilename(formId)).then(JSON.parse)
}

/**
 * Uploads fileContent to an S3 bucket as fileName
 * @param {string} fileName - the file name to upload
 * @param {string} fileContent - the content to upload
 */
async function uploadToS3(fileName, fileContent) {
  if (!formBucketName) {
    throw new Error('config.formBucketName cannot be null')
  }

  const command = new PutObjectCommand({
    Bucket: formBucketName,
    Key: fileName,
    Body: fileContent.toString()
  })

  return s3Client.send(command)
}

/**
 * Uploads fileContent to an S3 bucket as fileName
 * @param {string} fileName - the file name to read`
 * @returns {Promise<string>} - the content of the file
 */
async function retrieveFromS3(fileName) {
  if (!formBucketName) {
    throw new Error('config.formBucketName cannot be null')
  }

  const command = new GetObjectCommand({
    Bucket: formBucketName,
    Key: fileName
  })

  const response = await s3Client.send(command)

  if (!response.Body) {
    throw new FailedToReadFormError('Could not read form body from S3')
  }

  return response.Body.transformToString()
}
