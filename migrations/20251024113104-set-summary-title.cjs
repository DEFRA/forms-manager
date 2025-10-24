/* eslint-disable no-console */
const LIVE = 'live'
const DRAFT = 'draft'

// Cannot import values from '@defra/forms-model' due to restrictions
const ControllerTypeSummary = 'SummaryPageController'
const v1ControllerTypeSummary = './pages/summary.js'
const ControllerTypeSummaryWithConfirmationEmail =
  'SummaryPageWithConfirmationEmailController'
const CHECK_YOUR_ANSWERS_TITLE = 'Check your answers before sending your form'
const DEFINITION_COLLECTION_NAME = 'form-definition'
const BATCH_SIZE = 10

/**
 * @param {Collection<{ draft?: FormDefinition; live?: FormDefinition;}>} definitionCollection
 * @param {DRAFT | LIVE} draftOrLive
 */
async function getV1FormIdsToMigrate(definitionCollection, draftOrLive) {
  const query =
    draftOrLive === DRAFT
      ? {
          $and: [
            {
              'draft.schema': { $ne: 2 }
            },
            {
              'draft.pages.controller': {
                $in: [
                  ControllerTypeSummary,
                  v1ControllerTypeSummary,
                  ControllerTypeSummaryWithConfirmationEmail
                ]
              }
            },
            {
              'draft.pages.title': 'Summary'
            }
          ]
        }
      : {
          $and: [
            {
              'live.schema': { $ne: 2 }
            },
            {
              'live.pages.controller': {
                $in: [
                  ControllerTypeSummary,
                  v1ControllerTypeSummary,
                  ControllerTypeSummaryWithConfirmationEmail
                ]
              }
            },
            {
              'live.pages.title': 'Summary'
            }
          ]
        }

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
 * @param {Collection<{ draft?: FormDefinition; live?: FormDefinition;}>} definitionCollection
 * @param {DRAFT | LIVE} draftOrLive
 */
async function getV2FormIdsToMigrate(definitionCollection, draftOrLive) {
  const query =
    draftOrLive === DRAFT
      ? {
          $and: [
            {
              'draft.schema': 2
            },
            {
              'draft.pages.controller': {
                $in: [
                  ControllerTypeSummary,
                  v1ControllerTypeSummary,
                  ControllerTypeSummaryWithConfirmationEmail
                ]
              }
            },
            {
              'draft.pages.title': 'Summary'
            }
          ]
        }
      : {
          $and: [
            {
              'live.schema': 2
            },
            {
              'live.pages.controller': {
                $in: [
                  ControllerTypeSummary,
                  v1ControllerTypeSummary,
                  ControllerTypeSummaryWithConfirmationEmail
                ]
              }
            },
            {
              'live.pages.title': 'Summary'
            }
          ]
        }

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
async function updateDefinitionsV1(client, definitionCollection, draftOrLive) {
  let total = 0
  let updated = 0
  let errors = 0

  const session = client.startSession()

  await session.withTransaction(async () => {
    let v1FormIdsToMigrate = []

    try {
      v1FormIdsToMigrate = await getV1FormIdsToMigrate(
        definitionCollection,
        draftOrLive
      )

      total = v1FormIdsToMigrate.length

      if (v1FormIdsToMigrate.length === 0) {
        console.log(
          `No ${draftOrLive.toUpperCase()} v1 forms found for migration`
        )
        return {
          updated,
          skipped: 0,
          errors,
          total
        }
      } else {
        console.log(
          `Found ${v1FormIdsToMigrate.length} ${draftOrLive.toUpperCase()} v1 forms for migration`
        )
      }

      for (const form of v1FormIdsToMigrate) {
        const setExpr =
          draftOrLive === DRAFT
            ? {
                $set: {
                  'draft.pages.$[elem].title': CHECK_YOUR_ANSWERS_TITLE
                }
              }
            : {
                $set: {
                  'live.pages.$[elem].title': CHECK_YOUR_ANSWERS_TITLE
                }
              }

        await definitionCollection.findOneAndUpdate(
          { _id: form._id },
          setExpr,
          {
            arrayFilters: [
              {
                'elem.controller': {
                  $in: [
                    ControllerTypeSummary,
                    v1ControllerTypeSummary,
                    ControllerTypeSummaryWithConfirmationEmail
                  ]
                }
              }
            ]
          }
        )
        updated++
        console.log(
          `Migrated v1 ${draftOrLive.toUpperCase()} form ${form.draft?.name ?? form.live?.name} to use new summary title`
        )
      }
    } catch (error) {
      console.error(
        `Migration v1 failed for ${draftOrLive}:`,
        error instanceof Error ? error.message : String(error)
      )
      errors = v1FormIdsToMigrate.length - updated
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
async function updateDefinitionsV2(client, definitionCollection, draftOrLive) {
  let total = 0
  let updated = 0
  let errors = 0

  const session = client.startSession()

  await session.withTransaction(async () => {
    let v2FormIdsToMigrate = []

    try {
      v2FormIdsToMigrate = await getV2FormIdsToMigrate(
        definitionCollection,
        draftOrLive
      )

      total = v2FormIdsToMigrate.length

      if (v2FormIdsToMigrate.length === 0) {
        console.log(
          `No ${draftOrLive.toUpperCase()} v2 forms found for migration`
        )
        return {
          updated,
          skipped: 0,
          errors,
          total
        }
      } else {
        console.log(
          `Found ${v2FormIdsToMigrate.length} ${draftOrLive.toUpperCase()} v2 forms for migration`
        )
      }

      for (const form of v2FormIdsToMigrate) {
        const setExpr =
          draftOrLive === DRAFT
            ? {
                $set: {
                  'draft.pages.$[elem].title': ''
                }
              }
            : {
                $set: {
                  'live.pages.$[elem].title': ''
                }
              }

        await definitionCollection.findOneAndUpdate(
          { _id: form._id },
          setExpr,
          {
            arrayFilters: [
              {
                'elem.controller': {
                  $in: [
                    ControllerTypeSummary,
                    v1ControllerTypeSummary,
                    ControllerTypeSummaryWithConfirmationEmail
                  ]
                }
              }
            ]
          }
        )
        updated++
        console.log(
          `Migrated v2 ${draftOrLive.toUpperCase()} form ${form.draft?.name ?? form.live?.name} to use clear summary title so default gets used`
        )
      }
    } catch (error) {
      console.error(
        `Migration v2 failed for ${draftOrLive}:`,
        error instanceof Error ? error.message : String(error)
      )
      errors = v2FormIdsToMigrate.length - updated
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
 * @param {'v1' | 'v2'} version
 */
async function migrateDraftOrLive(
  client,
  definitionCollection,
  draftOrLive,
  version
) {
  const stats = {
    updated: 0,
    skipped: 0,
    errors: 0,
    total: 0
  }

  do {
    const res =
      version === 'v1'
        ? await updateDefinitionsV1(client, definitionCollection, draftOrLive)
        : await updateDefinitionsV2(client, definitionCollection, draftOrLive)

    stats.updated += res.updated
    stats.skipped += res.skipped
    stats.errors += res.errors
    stats.total += res.total

    if (res.total === 0) {
      console.log(
        `\n=== Migration Summary (${draftOrLive.toUpperCase()}) ${version} ===`
      )
      console.log(`Total forms processed: ${stats.total}`)
      console.log(`Successfully migrated: ${stats.updated}`)
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

    await migrateDraftOrLive(client, definitionCollection, DRAFT, 'v1')
    await migrateDraftOrLive(client, definitionCollection, DRAFT, 'v2')

    await migrateDraftOrLive(client, definitionCollection, LIVE, 'v1')
    await migrateDraftOrLive(client, definitionCollection, LIVE, 'v2')
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
