/* eslint-disable no-console */
const METADATA_COLLECTION_NAME = 'form-metadata'

/**
 * @param {MongoClient} client
 * @param {Collection<FormMetadata>} metadataCollection
 */
async function removeVersionsAttribute(client, metadataCollection) {
  const stats = {
    updated: 0,
    errors: 0
  }

  const session = client.startSession()

  await session.withTransaction(async () => {
    const updatesCursor = metadataCollection.find({
      versions: { $exists: true }
    })

    for await (const forUpdate of updatesCursor) {
      try {
        await metadataCollection.updateOne(
          {
            _id: forUpdate._id
          },
          { $unset: { versions: '' } }
        )
        stats.updated++
      } catch (error) {
        console.error(
          `Removing 'versions' attribute failed for slug ${forUpdate.slug}:`,
          error instanceof Error ? error.message : String(error)
        )
        stats.errors++
      }
    }
  })

  console.log(`\n=== Migration Summary - remove 'versions' attributes ===`)
  console.log(`Successfully updated: ${stats.updated}`)
  console.log(`Errors: ${stats.errors}`)

  console.log(' ')
  console.log(' ')
}

/**
 * Removes the 'versions' attribute from all metadata records
 * @param {import('mongodb').Db} db
 * @param {import('mongodb').MongoClient} client
 * @returns {Promise<void>}
 */
export async function up(db, client) {
  const metadataCollection = /** @type {Collection<FormMetadata>} */ (
    db.collection(METADATA_COLLECTION_NAME)
  )
  await removeVersionsAttribute(client, metadataCollection)
}

/**
 * This migration is a one-way data consolidation fix.
 * @returns {Promise<void>}
 */
export function down() {
  return Promise.reject(
    new Error('Migration rollback is not supported for data safety reasons')
  )
}

/**
 * @import { FormMetadata } from '@defra/forms-model'
 * @import { Collection, MongoClient, Db } from 'mongodb'
 */
