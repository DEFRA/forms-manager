/* eslint-disable no-console */
const LIVE = 'live'
const DRAFT = 'draft'

// Cannot import values from '@defra/forms-model' due to restrictions
const ControllerTypeSummary = 'SummaryPageController'
const ControllerTypeSummaryWithConfirmationEmail =
  'SummaryPageWithConfirmationEmailController'
const DEFINITION_COLLECTION_NAME = 'form-definition'
const BATCH_SIZE = 10

/**
 * @param {Collection<{ draft?: FormDefinition; live?: FormDefinition;}>} definitionCollection
 * @param {DRAFT | LIVE} draftOrLive
 */
async function getFormIdsToMigrate(definitionCollection, draftOrLive) {
  const query =
    draftOrLive === DRAFT
      ? { 'draft.pages.controller': ControllerTypeSummary }
      : { 'live.pages.controller': ControllerTypeSummary }

  const projection =
    draftOrLive === DRAFT
      ? { projection: { draft: { name: 1 } } }
      : { projection: { live: { name: 1 } } }

  return await definitionCollection
    .find(query, projection)
    .limit(BATCH_SIZE)
    .toArray()
}

/**
 * @param {MongoClient} client
 * @param {Collection<{ draft?: FormDefinition; live?: FormDefinition;}>} definitionCollection
 * @param {DRAFT | LIVE} draftOrLive
 */
async function updateDefinitions(client, definitionCollection, draftOrLive) {
  let total = 0
  let updated = 0
  let errors = 0

  const session = client.startSession()

  await session.withTransaction(async () => {
    let formIdsToMigrate = []

    try {
      formIdsToMigrate = await getFormIdsToMigrate(
        definitionCollection,
        draftOrLive
      )

      total = formIdsToMigrate.length

      if (formIdsToMigrate.length === 0) {
        console.log(`No ${draftOrLive.toUpperCase()} forms found for migration`)
        return {
          updated,
          skipped: 0,
          errors,
          total
        }
      } else {
        console.log(
          `Found ${formIdsToMigrate.length} ${draftOrLive.toUpperCase()} forms for migration`
        )
      }

      for (const form of formIdsToMigrate) {
        const setExpr =
          draftOrLive === DRAFT
            ? {
                $set: {
                  'draft.pages.$[elem].controller':
                    ControllerTypeSummaryWithConfirmationEmail
                }
              }
            : {
                $set: {
                  'live.pages.$[elem].controller':
                    ControllerTypeSummaryWithConfirmationEmail
                }
              }

        await definitionCollection.findOneAndUpdate(
          { _id: form._id },
          setExpr,
          { arrayFilters: [{ 'elem.controller': ControllerTypeSummary }] }
        )
        updated++
        console.log(
          `Migrated ${draftOrLive.toUpperCase()} form ${form.draft?.name ?? form.live?.name} to use SummaryWithConfirmationEmail controller`
        )
      }
    } catch (error) {
      console.error(
        `Migration failed for ${draftOrLive}:`,
        error instanceof Error ? error.message : String(error)
      )
      errors = formIdsToMigrate.length - updated
    } finally {
      await session.endSession()
    }
  })

  return {
    updated,
    skipped: total - updated - errors,
    errors,
    total
  }
}

/**
 * @param {MongoClient} client
 * @param {Collection<{ draft?: FormDefinition; live?: FormDefinition;}>} definitionCollection
 * @param {DRAFT | LIVE} draftOrLive
 */
async function migrateDraftOrLive(client, definitionCollection, draftOrLive) {
  const stats = {
    updated: 0,
    skipped: 0,
    errors: 0,
    total: 0
  }

  do {
    const res = await updateDefinitions(
      client,
      definitionCollection,
      draftOrLive
    )

    stats.updated += res.updated
    stats.skipped += res.skipped
    stats.errors += res.errors
    stats.total += res.total

    if (res.total === 0) {
      console.log(`\n=== Migration Summary (${draftOrLive.toUpperCase()}) ===`)
      console.log(`Total forms processed: ${stats.total}`)
      console.log(
        `Successfully migrated to new SummaryWithConfrimationEmail controller: ${stats.updated}`
      )
      console.log(`Skipped (already migrated): ${stats.skipped}`)
      console.log(`Errors: ${stats.errors}`)

      console.log(' ')
      console.log(' ')
      break
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  } while (true)
}

/* eslint-disable */
module.exports = {
  /**
   * Changes any summary controllers from 'Summary' to 'SummaryWithConfirmationEmail'
   * @param {Db} db
   * @param {MongoClient} client
   * @returns {Promise<void>}
   */
  async up(db, client) {
    const definitionCollection =
      /** @satisfies {Collection<{draft?: FormDefinition, live?: FormDefinition}>} */ (
        db.collection(DEFINITION_COLLECTION_NAME)
      )

    await migrateDraftOrLive(client, definitionCollection, DRAFT)

    await migrateDraftOrLive(client, definitionCollection, LIVE)
  },

  /**
   * This migration is a one-way data consolidation fix.
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    throw new Error(
      'Migration rollback is not supported for data safety reasons'
    )
  }
}

/**
 * @import { FormDefinition } from '@defra/forms-model'
 * @import { Collection, MongoClient, Db } from 'mongodb'
 */
