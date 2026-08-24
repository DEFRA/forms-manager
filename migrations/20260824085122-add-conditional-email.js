/* eslint-disable no-console */
const METADATA_COLLECTION_NAME = 'form-metadata'
const DEFINITION_COLLECTION_NAME = 'form-definition'

/**
 * Loops through any definitions with 'outputs' defined (ignoring empty arrays), and
 * appends the submission email to the array.
 * @param {string} draftOrLive - 'draft' or 'live'
 * @param {Collection<FormMetadata>} metadataCollection
 * @param {Collection<FormDefinition>} definitionCollection
 * @param {{ updated: number, errors: number }} stats
 */
async function updateRecords(draftOrLive, metadataCollection, definitionCollection, stats) {
  const updatesCursor = definitionCollection.find({
    [`${draftOrLive}.outputs`]: { $exists: true }
  })
  for await (const forUpdate of updatesCursor) {
    if (forUpdate.outputs?.length === 0) {
      continue
    }
    const metadata = await metadataCollection.findOne({ _id: forUpdate._id })

    try {
      const submissionEmail = /** @type {string} */ (metadata?.notificationEmail)

      await definitionCollection.updateOne(
        {
          _id: forUpdate._id
        },
        { $push: { [`${draftOrLive}.outputs`]: { emailAddress: submissionEmail, audience: 'human', version: '2' } } }
      )
      stats.updated++
    } catch (error) {
      console.error(
        `Updating ${draftOrLive} 'outputs' failed for slug ${metadata?.slug}`,
        error instanceof Error ? error.message : String(error)
      )
      stats.errors++
    }
  }
}

/**
 * @param {MongoClient} client
 * @param {Collection<FormMetadata>} metadataCollection
 * @param {Collection<FormDefinition>} definitionCollection
 */
async function migrateOutputs(client, metadataCollection, definitionCollection) {
  const stats = {
    updated: 0,
    errors: 0
  }

  const session = client.startSession()

  await session.withTransaction(async () => {
    await updateRecords('draft', metadataCollection, definitionCollection, stats)
    await updateRecords('live', metadataCollection, definitionCollection, stats)
  })

  console.log(`\n=== Migration Summary - updated 'outputs' ===`)
  console.log(`Successfully updated: ${stats.updated}`)
  console.log(`Errors: ${stats.errors}`)

  console.log(' ')
  console.log(' ')
}

/**
 * Handles new structures for conditional emails.
 * With the implementation of the new conditional emails, supplemental email addresses can be defined
 * (in addition to the normal submission address that forms get sent to).
 * When a supplemental address is sent to (either due to a condition being satisfied or if the email address
 * doesn't have a condition), forms will not get submitted to the normal submission address. This is a change
 * to how it used to work.
 * Therefore this migration appends the normal submission address as a supplemental (non-condition) email address
 * to ensure the normal submission address ALWAYS gets form submisions, thereby keeping old functionality as it was.
 * @param {Db} db
 * @param {MongoClient} client
 * @returns {Promise<void>}
 */
export async function up(db, client) {
  const metadataCollection = /** @type {Collection<FormMetadata>} */ (
    db.collection(METADATA_COLLECTION_NAME)
  )
  const definitionCollection = /** @type {Collection<FormDefinition>} */ (
    db.collection(DEFINITION_COLLECTION_NAME)
  )
  await migrateOutputs(client, metadataCollection, definitionCollection)
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
 * @import { FormDefinition, FormMetadata } from '@defra/forms-model'
 * @import { Collection, MongoClient, Db } from 'mongodb'
 */
