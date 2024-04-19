// import { BSONError } from 'bson'

// import {
//   list,
//   get,
//   MAX_RESULTS
// } from '~/src/api/forms/form-metadata-repository.js'
// import * as dbModule from '~/src/db.js'
// import { COLLECTION_NAME } from '~/src/db.js'

// jest.mock('~/src/db.js')

// const metadata = {
//   id: '661e4ca5039739ef2902b214',
//   title: 'Test form',
//   organisation: 'Defra',
//   teamName: 'Defra Forms',
//   teamEmail: 'defraforms@defra.gov.uk',
//   linkIdentifier: 'test-form'
// }

// describe('#listForms', () => {
//   test('Should return an empty array if no forms found', async () => {
//     /**
//      * @type {DocumentWithId[]}
//      */
//     const items = []

//     const collection = {
//       find: jest.fn().mockReturnThis(),
//       limit: jest.fn().mockReturnThis(),
//       toArray: jest.fn(() => items)
//     }

//     const db = { collection: jest.fn(() => collection) }
//     dbModule.db = db

//     const result = await list()

//     expect(result).toEqual(items)
//     expect(db.collection).toHaveBeenCalledWith(COLLECTION_NAME)
//     expect(collection.find).toHaveBeenCalled()
//     expect(collection.limit).toHaveBeenCalledWith(MAX_RESULTS)
//     expect(collection.toArray).toHaveBeenCalled()
//   })

//   test('Should return an array of form metadata', async () => {
//     const items = [metadata]

//     /**
//      * @type {Collection}
//      */
//     const collection = {
//       find: jest.fn().mockReturnThis(),
//       limit: jest.fn().mockReturnThis(),
//       toArray: jest.fn(() => items)
//     }

//     /**
//      * @type {Db}
//      */
//     const db = { collection: jest.fn(() => collection) }
//     dbModule.db = db

//     const result = await list()

//     expect(result).toEqual(items)
//     expect(db.collection).toHaveBeenCalledWith(COLLECTION_NAME)
//     expect(collection.find).toHaveBeenCalled()
//     expect(collection.limit).toHaveBeenCalledWith(MAX_RESULTS)
//     expect(collection.toArray).toHaveBeenCalled()
//   })
// })

// describe('#getFormMetadata', () => {
//   test('Should return the form metadata', async () => {
//     const formId = metadata.id
//     const collection = {
//       findOne: jest.fn(() => metadata)
//     }

//     /** @type {Db} */
//     const db = { collection: jest.fn(() => collection) }
//     dbModule.db = db

//     const result = await get(formId)

//     expect(result).toEqual(metadata)
//     expect(db.collection).toHaveBeenCalledWith(COLLECTION_NAME)
//     expect(collection.findOne).toHaveBeenCalled()
//   })

//   test('Should throw an error if form id malformed', async () => {
//     const formId = 'form-1'
//     const collection = {
//       findOne: jest.fn(() => metadata)
//     }

//     const db = { collection: jest.fn(() => collection) }
//     dbModule.db = db

//     await expect(async () => {
//       await get(formId)
//     }).rejects.toThrow(BSONError)
//   })
// })

// /**
//  * @typedef {import('mongodb').Db} Db
//  * @typedef {import('mongodb').Collection} Collection
//  * @typedef {import('~/src/api/forms/form-metadata-repository.js').DocumentWithId} DocumentWithId
//  */

test('Test suite must contain at least one test', () => {
  expect(1).toBe(1)
})
