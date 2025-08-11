import { createS3File, getS3Client } from '~/src/api/files/utils.js'

const s3Client = getS3Client()
/**
 * @param {string} key
 * @param {string} body
 */
const createS3Json = (key, body) =>
  createS3File(key, body, 'application/json', s3Client)

const S3_KEY_BASE = 'audit-definitions/'

/**
 * @param {string} formId
 * @param {FormDefinition} formDefinition
 * @returns {Promise<FormDefinitionS3Meta>}
 */
export async function saveToS3(formId, formDefinition) {
  const body = JSON.stringify(formDefinition)
  const filename = `${formId}.json`
  const s3Key = S3_KEY_BASE + filename
  const result = await createS3Json(s3Key, body)

  return {
    fileId: result.VersionId ?? '',
    filename,
    s3Key
  }
}

/**
 * @import { FormDefinition, FormDefinitionS3Meta } from '@defra/forms-model'
 */
