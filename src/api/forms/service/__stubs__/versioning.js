/* eslint-env jest */
import { FormStatus } from '@defra/forms-model'
import { ObjectId } from 'mongodb'

import author from '~/src/api/forms/service/__stubs__/author.js'

/**
 * Mock form version document
 * @satisfies {FormVersionDocument}
 */
export const mockFormVersionDocument = {
  _id: new ObjectId(),
  formId: '661e4ca5039739ef2902b214',
  versionNumber: 1,
  changeType: 'form_created',
  changeDescription: 'Form created',
  status: FormStatus.Draft,
  createdAt: new Date('2020-01-01'),
  createdBy: author,
  metadata: {
    title: 'Test form',
    slug: 'test-form',
    organisation: 'Defra',
    teamName: 'Defra Forms',
    teamEmail: 'defraforms@defra.gov.uk'
  },
  formDefinition: {
    name: 'Test form',
    pages: [],
    lists: [],
    conditions: [],
    sections: []
  }
}

/**
 * Creates a mock for the versioning service module
 * @returns {object} Mocked versioning service functions
 */
export function createVersioningServiceMock() {
  return {
    createFormVersion: jest.fn().mockResolvedValue(mockFormVersionDocument),
    getFormVersion: jest.fn().mockResolvedValue(mockFormVersionDocument),
    getLatestFormVersion: jest.fn().mockResolvedValue(mockFormVersionDocument),
    getFormVersions: jest.fn().mockResolvedValue([mockFormVersionDocument]),
    removeFormVersions: jest.fn().mockResolvedValue(undefined)
  }
}

/**
 * @import { FormVersionDocument } from '~/src/api/types.js'
 */
