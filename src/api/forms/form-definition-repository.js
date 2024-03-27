import { join } from 'node:path'

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  NoSuchKey
} from '@aws-sdk/client-s3'

import { FailedToReadFormError } from './errors.js'

import { config } from '~/src/config/index.js'

const s3Region = config.get('s3Region')
const formBucketName = config.get('formDefinitionBucketName')

/**
 * Gets a filename for a given form ID
 * @param {string} formId - the form ID
 * @returns - the path to the form definition file
 */
function getFormDefinitionFilename(formId) {
  const formDirectory = config.get('formDirectory')

  return join(formDirectory, `${formId}.json`)
}

/**
 * Adds a form to the Form Store
 * @param {import('../types.js').FormConfiguration} formConfiguration - form configuration
 * @param {object} formDefinition - form definition (JSON object)
 */
export function create(formConfiguration, formDefinition) {
  const formDefinitionFilename = getFormDefinitionFilename(formConfiguration.id)

  // Convert formMetadata to JSON string
  const formDefinitionString = JSON.stringify(formDefinition)

  // Write formDefinition to file
  return uploadToS3(formDefinitionFilename, formDefinitionString)
}

/**
 * Retrieves the form definition for a given form ID
 * @param {string} formId - the ID of the form
 * @returns {Promise<object>} - form definition JSON content
 */
export function get(formId) {
  return retrieveFromS3(getFormDefinitionFilename(formId)).then(JSON.parse)
}

/**
 * Uploads fileContent to an S3 bucket as fileName
 * @param {string} fileName - the file name to upload
 * @param {string} fileContent - the content to upload
 */
function uploadToS3(fileName, fileContent) {
  if (!formBucketName) {
    throw new Error('config.formBucketName cannot be null')
  }

  const command = new PutObjectCommand({
    Bucket: formBucketName,
    Key: fileName,
    Body: fileContent.toString()
  })

  return getS3Client().send(command)
}

/**
 * Uploads fileContent to an S3 bucket as fileName
 * @param {string} fileName - the file name to read`
 * @returns {Promise<string>} - the content of the file
 * @throws {FailedToReadFormError} - if the file does not exist or is empty
 */
async function retrieveFromS3(fileName) {
  if (!formBucketName) {
    throw new Error('config.formBucketName cannot be null')
  }

  const command = new GetObjectCommand({
    Bucket: formBucketName,
    Key: fileName
  })

  try {
    const response = await getS3Client().send(command)

    if (!response.Body) {
      throw new FailedToReadFormError('Form definition does exist but is empty')
    }

    return response.Body.transformToString()
  } catch (error) {
    if (error instanceof NoSuchKey) {
      throw new FailedToReadFormError('Form definition does not exist on disk')
    }

    throw error
  }
}

/**
 * Retrieves an S3 client instance
 * @returns {S3Client} - the S3 client instance
 */
function getS3Client() {
  return new S3Client({
    region: s3Region,
    ...(config.get('s3Endpoint') && {
      endpoint: config.get('s3Endpoint'),
      forcePathStyle: true
    })
  })
}
