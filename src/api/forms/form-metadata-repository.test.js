import { BSONError } from 'bson'

import {
  list,
  get,
  COLLECTION_NAME,
  MAX_RESULTS
} from '~/src/api/forms/form-metadata-repository.js'

const metadata = {
  _id: '661e4ca5039739ef2902b214',
  title: 'Test form',
  organisation: 'Defra',
  teamName: 'Defra Forms',
  teamEmail: 'defraforms@defra.gov.uk',
  linkIdentifier: 'test-form'
}

describe('#listForms', () => {
  test('Should return an empty array if no forms found', async () => {
    const items = []

    const collection = {
      find: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn(() => items)
    }

    const db = { collection: jest.fn(() => collection) }

    const result = await list(db)

    expect(result).toEqual(items)
    expect(db.collection).toHaveBeenCalledWith(COLLECTION_NAME)
    expect(collection.find).toHaveBeenCalled()
    expect(collection.limit).toHaveBeenCalledWith(MAX_RESULTS)
    expect(collection.toArray).toHaveBeenCalled()
  })

  test('Should return an array of form metadata', async () => {
    const items = [metadata]

    const collection = {
      find: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn(() => items)
    }

    const db = { collection: jest.fn(() => collection) }

    const result = await list(db)

    expect(result).toEqual(items)
    expect(db.collection).toHaveBeenCalledWith(COLLECTION_NAME)
    expect(collection.find).toHaveBeenCalled()
    expect(collection.limit).toHaveBeenCalledWith(MAX_RESULTS)
    expect(collection.toArray).toHaveBeenCalled()
  })
})

describe('#getFormMetadata', () => {
  test('Should return the form metadata', async () => {
    const formId = metadata.id
    const collection = {
      findOne: jest.fn(() => metadata)
    }

    const db = { collection: jest.fn(() => collection) }

    const result = await get(formId, db)

    expect(result).toEqual(metadata)
    expect(db.collection).toHaveBeenCalledWith(COLLECTION_NAME)
    expect(collection.findOne).toHaveBeenCalled()
  })

  test('Should throw an error if form id malformed', async () => {
    const formId = 'form-1'
    const collection = {
      findOne: jest.fn(() => metadata)
    }

    const db = { collection: jest.fn(() => collection) }

    await expect(async () => {
      await get(formId, db)
    }).rejects.toThrow(BSONError)
  })
})
