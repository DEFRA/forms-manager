import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

import { config } from '~/src/config/index.js'

const s3Region = config.get('awsRegion')
const s3Bucket = config.get('s3Bucket')

/**
 * Create a file in S3.
 * @param {string} key - the key of the file
 * @param {string} body - file body
 * @param {string} contentType - content type
 * @param {S3Client} client - S3 client
 */
export function createS3File(key, body, contentType, client) {
  return client.send(
    new PutObjectCommand({
      Bucket: s3Bucket,
      Key: key,
      Body: body,
      ContentType: contentType
    })
  )
}

/**
 * Retrieves an S3 client
 * @returns {S3Client}
 */
export function getS3Client() {
  return new S3Client({
    region: s3Region,
    ...(config.get('s3Endpoint') && {
      endpoint: config.get('s3Endpoint'),
      forcePathStyle: true
    })
  })
}
