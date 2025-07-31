import { ObjectId } from 'mongodb'

export const metadataId = '661e4ca5039739ef2902b214'
export const _id = new ObjectId(metadataId)
export const slug = 'application-to-join-the-fellowship'
export const title = 'Application to join the fellowship'
export const fakeCreatedAt = new Date('2020-01-01')
export const fakeUpdatedAt = new Date('2025-07-31')

/**
 * @param {Partial<WithId<Partial<FormMetadataDocument>>>} partialMetadataDocument
 */
export function buildMetadataDocument(partialMetadataDocument = {}) {
  return {
    _id,
    title,
    slug,
    organisation: 'Defra',
    teamName: 'Keepers of Rivendell',
    teamEmail: 'fellowship.applications@middleearth.com',
    createdAt: fakeCreatedAt,
    createdBy: {
      id: '6268b212-af63-48bc-a996-f1d27a708ac4',
      displayName: 'Elron'
    },
    updatedAt: fakeUpdatedAt,
    updatedBy: {
      id: '85a00f67-847d-4e93-839a-af86a61e725c',
      displayName: 'Gandalf'
    },
    draft: {
      createdAt: fakeCreatedAt,
      createdBy: {
        id: '6268b212-af63-48bc-a996-f1d27a708ac4',
        displayName: 'Elron'
      },
      updatedAt: fakeUpdatedAt,
      updatedBy: {
        id: '85a00f67-847d-4e93-839a-af86a61e725c',
        displayName: 'Gandalf'
      }
    },
    ...partialMetadataDocument
  }
}

/**
 * @import { WithId } from 'mongodb'
 * @import { FormMetadataDocument } from '@defra/forms-model'
 */
