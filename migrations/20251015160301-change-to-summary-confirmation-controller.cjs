/* eslint-disable no-console */
const LIVE = 'live'
const DRAFT = 'draft'

// Cannot import values from '@defra/forms-model' due to restrictions
const ControllerTypeSummary = 'SummaryPageController'
const ControllerTypeSummaryWithConfirmationEmail =
  'SummaryPageWithConfirmationEmailController'
const DEFINITION_COLLECTION_NAME = 'form-definition'

/**
 * @param {Collection<{ draft?: FormDefinition; live?: FormDefinition;}>} definitionCollection
 */
async function getDraftFormIdsToMigrate(definitionCollection) {
  return await definitionCollection
    .find(
      {
        'draft.pages.controller': ControllerTypeSummary
      },
      {
        projection: { draft: { name: 1 } }
      }
    )
    .toArray()
}

/**
 * @param {Collection<{ draft?: FormDefinition; live?: FormDefinition;}>} definitionCollection
 */
async function getLiveFormIdsToMigrate(definitionCollection) {
  return await definitionCollection
    .find(
      {
        'live.pages.controller': ControllerTypeSummary
      },
      {
        projection: { live: { name: 1 } }
      }
    )
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
      total = await definitionCollection.countDocuments()

      formIdsToMigrate =
        draftOrLive === DRAFT
          ? await getDraftFormIdsToMigrate(definitionCollection)
          : await getLiveFormIdsToMigrate(definitionCollection)

      total = formIdsToMigrate.length

      if (formIdsToMigrate.length === 0) {
        console.log(`No ${draftOrLive.toUpperCase()} forms found for migration`)
        return
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

    const draftRes = await updateDefinitions(
      client,
      definitionCollection,
      DRAFT
    )
    console.log('\n=== Migration Summary (DRAFT) ===')
    console.log(`Total forms processed: ${draftRes.total}`)
    console.log(
      `Successfully migrated to new SummaryWithConfrimationEmail controller: ${draftRes.updated}`
    )
    console.log(`Skipped (already migrated): ${draftRes.skipped}`)
    console.log(`Errors: ${draftRes.errors}`)

    console.log(' ')
    console.log(' ')

    const liveRes = await updateDefinitions(client, definitionCollection, LIVE)
    console.log('\n=== Migration Summary (LIVE) ===')
    console.log(`Total forms processed: ${liveRes.total}`)
    console.log(
      `Successfully migrated to new SummaryWithConfrimationEmail controller: ${liveRes.updated}`
    )
    console.log(`Skipped (already migrated): ${liveRes.skipped}`)
    console.log(`Errors: ${liveRes.errors}`)
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
