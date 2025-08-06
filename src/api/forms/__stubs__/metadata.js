import { ObjectId } from 'mongodb'

export const metadataId = '681b184463c68bf6b99e2c62'
export const _id = new ObjectId(metadataId)
export const slug = 'chemistry'
export const title = 'Chemistry'
export const fakeCreatedAt = new Date('2025-05-07T08:22:28.035Z')
export const fakeUpdatedAt = new Date('2025-05-20T13:00:54.794Z')

/**
 * @param {Partial<WithId<Partial<FormMetadataDocument>>>} partialMetadataDocument
 */
export function buildMetadataDocument(partialMetadataDocument = {}) {
  return {
    _id,
    title,
    slug,
    organisation: 'Defra',
    teamName: 'Forms Team',
    teamEmail: 'name@example.gov.uk',
    createdAt: fakeCreatedAt,
    createdBy: {
      id: '84305e4e-1f52-43d0-a123-9c873b0abb35',
      displayName: 'Internal User'
    },
    updatedAt: fakeUpdatedAt,
    updatedBy: {
      id: '84305e4e-1f52-43d0-a123-9c873b0abb35',
      displayName: 'Internal User'
    },
    draft: {
      createdAt: new Date('2025-05-07T08:22:28.035Z'),
      createdBy: {
        id: '84305e4e-1f52-43d0-a123-9c873b0abb35',
        displayName: 'Internal User'
      },
      updatedAt: new Date('2025-05-20T13:00:54.794Z'),
      updatedBy: {
        id: '84305e4e-1f52-43d0-a123-9c873b0abb35',
        displayName: 'Internal User'
      }
    },
    ...partialMetadataDocument
  }
}

/**
 * @import { WithId } from 'mongodb'
 * @import { FormMetadataDocument } from '@defra/forms-model'
 */
