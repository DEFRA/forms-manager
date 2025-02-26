/* eslint-env jest */
import { ObjectId } from 'mongodb'

import { getAuthor } from '~/src/helpers/get-author.js'
const id = '661e4ca5039739ef2902b214'
const slug = 'test-form'
const author = getAuthor()
export const DRAFT = 'draft'

/**
 * @satisfies {FormMetadataInput}
 */
export const formMetadataInput = {
  title: 'Test form',
  organisation: 'Defra',
  teamName: 'Defra Forms',
  teamEmail: 'defraforms@defra.gov.uk',
  contact: {
    phone: '0800 000 1234'
  },
  submissionGuidance: 'We’ll send you an email to let you know the outcome.',
  privacyNoticeUrl: 'https://www.gov.uk/help/privacy-notice',
  notificationEmail: 'defraforms@defra.gov.uk'
}

/**
 * @satisfies {FormMetadata}
 */
export const formMetadataOutput = {
  ...formMetadataInput,
  id,
  slug,
  draft: {
    createdAt: expect.any(Date),
    createdBy: author,
    updatedAt: expect.any(Date),
    updatedBy: author
  },
  createdAt: expect.any(Date),
  createdBy: author,
  updatedAt: expect.any(Date),
  updatedBy: author
}

/**
 * @satisfies {FormMetadata}
 */
export const formMetadataWithLiveOutput = {
  ...formMetadataInput,
  id,
  slug,
  draft: {
    createdAt: expect.any(Date),
    createdBy: author,
    updatedAt: expect.any(Date),
    updatedBy: author
  },
  live: {
    createdAt: expect.any(Date),
    createdBy: author,
    updatedAt: expect.any(Date),
    updatedBy: author
  },
  createdAt: expect.any(Date),
  createdBy: author,
  updatedAt: expect.any(Date),
  updatedBy: author
}

/**
 * @satisfies {WithId<FormMetadataDocument>}
 */
export const formMetadataDocument = {
  ...formMetadataInput,
  _id: new ObjectId(id),
  slug: formMetadataOutput.slug,
  draft: formMetadataOutput.draft,
  createdAt: expect.any(Date),
  createdBy: author,
  updatedAt: expect.any(Date),
  updatedBy: author
}

/**
 * @satisfies {WithId<FormMetadataDocument>}
 */
export const formMetadataWithLiveDocument = {
  ...formMetadataInput,
  _id: new ObjectId(id),
  slug: formMetadataWithLiveOutput.slug,
  draft: formMetadataWithLiveOutput.draft,
  live: formMetadataWithLiveOutput.live,
  createdAt: expect.any(Date),
  createdBy: author,
  updatedAt: expect.any(Date),
  updatedBy: author
}

/**
 * @satisfies {FilterOptions}
 */
export const mockFilters = {
  authors: ['Joe Bloggs', 'Jane Doe', 'Enrique Chase'],
  organisations: ['Defra', 'Natural England'],
  status: ['live', DRAFT]
}

/**
 * @import { FormMetadataDocument, FormMetadataInput, FormMetadata, FilterOptions } from '@defra/forms-model'
 * @import { WithId } from 'mongodb'
 */
