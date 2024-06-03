import { join } from 'node:path'

import {
  S3Client,
  PutObjectCommand,
  NoSuchKey,
  CopyObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3'
import Boom from '@hapi/boom'

import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/helpers/logging/logger.js'

const logger = createLogger()

const s3Region = config.get('s3Region')
const formBucketName = config.get('formDefinitionBucketName')

/**
 * Gets the path to a form definition file for a given form ID
 * @param {string} formId - the form ID
 * @param {'draft' | 'live'} state - the form state
 */
function getFormDefinitionFilename(formId, state = 'draft') {
  const formDirectory = config.get('formDirectory')

  return join(formDirectory, state, `${formId}.json`)
}

/**
 * Adds a form to the Form Store
 * @param {string} id - id
 * @param {FormDefinition} formDefinition - form definition (JSON object)
 */
export async function create(id, formDefinition) {
  logger.info(`Creating form definition (draft) for form ID ${id}`)

  const formDefinitionFilename = getFormDefinitionFilename(id)

  // Convert form definition to JSON string
  const formDefinitionString = JSON.stringify(formDefinition)

  // Write formDefinition to file
  await uploadToS3(formDefinitionFilename, formDefinitionString)

  logger.info(`Created form definition (draft) for form ID ${id}`)
}

/**
 * Copy the draft form to live in the Form Store
 * @param {string} id - id
 */
export async function createLiveFromDraft(id) {
  logger.info(`Copying form definition (draft to live) for form ID ${id}`)

  const draftDefinitionFilename = getFormDefinitionFilename(id)
  const liveDefinitionFilename = getFormDefinitionFilename(id, 'live')

  // Copy draft definition to live
  await copyObject(draftDefinitionFilename, liveDefinitionFilename)

  logger.info(`Copied form definition (draft to live) for form ID ${id}`)
}

/**
 * Copy the live form to draft in the Form Store
 * @param {string} id - id
 */
export async function createDraftFromLive(id) {
  logger.info(`Copying form definition (live to draft) for form ID ${id}`)

  const draftDefinitionFilename = getFormDefinitionFilename(id)
  const liveDefinitionFilename = getFormDefinitionFilename(id, 'live')

  // Copy live definition to draft
  await copyObject(liveDefinitionFilename, draftDefinitionFilename)

  logger.info(`Copied form definition (live to draft) for form ID ${id}`)
}

/**
 * Retrieves the form definition for a given form ID
 * @param {string} formId - the ID of the form
 * @param {'draft' | 'live'} state - the form state
 */
export async function get(formId, state = 'draft') {
  logger.info(`Getting form definition (${state}) for form ID ${formId}`)

  const filename = getFormDefinitionFilename(formId, state)
  const body = await retrieveFromS3(filename)

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Allow JSON type 'any'
  const definition = /** @type {FormDefinition} */ (JSON.parse(body))

  logger.info(`Form definition (${state}) for form ID ${formId} found`)

  return definition
}

/**
 * Uploads fileContent to an S3 bucket as filename
 * @param {string} filename - the file name to upload
 * @param {string} fileContent - the content to upload
 */
function uploadToS3(filename, fileContent) {
  const command = new PutObjectCommand({
    Bucket: formBucketName,
    Key: filename,
    Body: fileContent
  })

  return getS3Client().send(command)
}

/**
 * Copy an S3 object
 * @param {string} source - the source file key
 * @param {string} destination - the destination file key
 */
function copyObject(source, destination) {
  const command = new CopyObjectCommand({
    Bucket: formBucketName,
    Key: destination,
    CopySource: `${formBucketName}/${source}`
  })

  return getS3Client().send(command)
}

/**
 * Retrieves filename content from an S3 bucket
 * @param {string} filename - the file name to read`
 */
async function retrieveFromS3(filename) {
  const command = new GetObjectCommand({
    Bucket: formBucketName,
    Key: filename
  })

  try {
    const response = await getS3Client().send(command)

    if (!response.Body) {
      throw Boom.notFound(
        `Form definition does exist but is empty at path ${filename}`
      )
    }

    return response.Body.transformToString()
  } catch (cause) {
    if (cause instanceof NoSuchKey) {
      throw Boom.notFound(
        `Form definition does not exist on disk at path ${filename}`
      )
    }

    throw cause
  }
}

/**
 * Retrieves an S3 client instance
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

/**
 * @typedef {import('@defra/forms-model').FormDefinition} FormDefinition
 */
