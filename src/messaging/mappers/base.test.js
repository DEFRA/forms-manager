import { buildMetaData } from '@defra/forms-model/stubs'

import { createV1MessageBase } from '~/src/messaging/mappers/base.js'

describe('base', () => {
  describe('createV1MessageBase', () => {
    it('should handle missing updatedAt and updatedBy in the updatedForm object', () => {
      const frodo = {
        id: '5d7c8817-6be0-493c-97e5-021b4c83113e',
        displayName: 'Frodo Baggins'
      }
      const gandalf = {
        id: 'ebf181ed-6e6b-488f-af23-13971ec9ed04',
        displayName: 'Gandalf'
      }
      const createdAt = new Date('2025-07-25')
      const updatedAt = new Date('2025-09-01')
      const metadata = buildMetaData({
        createdAt,
        updatedAt,
        createdBy: frodo,
        updatedBy: gandalf
      })
      const updatedForm = {
        title: 'New title'
      }
      const messageBase = createV1MessageBase(metadata, updatedForm)
      expect(messageBase).toMatchObject({
        createdAt: updatedAt,
        createdBy: gandalf
      })
    })
  })
})
