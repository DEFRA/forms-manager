import { AuditEventMessageType } from '@defra/forms-model'
import { pino } from 'pino'

import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import {
  deleteSecret,
  exists,
  get,
  rename,
  save
} from '~/src/api/forms/repositories/secrets-repository.js'
import { formMetadataDocument } from '~/src/api/forms/service/__stubs__/service.js'
import {
  deleteFormSecret,
  existsFormSecret,
  getFormSecret,
  renameFormSecret,
  saveFormSecret
} from '~/src/api/forms/service/secrets.js'
import { getAuthor } from '~/src/helpers/get-author.js'
import * as publishBase from '~/src/messaging/publish-base.js'
import { prepareDb } from '~/src/mongo.js'

jest.mock('~/src/helpers/get-author.js')
jest.mock('~/src/api/forms/repositories/form-metadata-repository.js')
jest.mock('~/src/api/forms/repositories/secrets-repository.js')
jest.mock('~/src/mongo.js')
jest.mock('~/src/messaging/publish-base.js')
jest.mock('src/api/forms/service/helpers/crypto.js')

jest.useFakeTimers().setSystemTime(new Date('2020-01-01'))

const formId = '661e4ca5039739ef2902b214'

describe('secrets', () => {
  const defaultAuthor = getAuthor()

  beforeAll(async () => {
    await prepareDb(pino())
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getFormSecret', () => {
    it('should return secret', async () => {
      // @ts-expect-error - not whole object mocked
      jest.mocked(get).mockResolvedValueOnce({ secretValue: 'my-secret-value' })

      const secretName = 'my-secret-name'
      const res = await getFormSecret(formId, secretName)

      expect(res).toBe('my-secret-value')
      // Verify repository was called with correct arguments
      const [formIdCalled, secretNameCalled] = jest.mocked(get).mock.calls[0]
      expect(formId).toBe(formIdCalled)
      expect(secretName).toBe(secretNameCalled)
    })
  })

  describe('existsFormSecret', () => {
    it('should return true if a form secret exists', async () => {
      const now = new Date()
      jest.mocked(exists).mockResolvedValueOnce({
        exists: true,
        createdAt: now,
        updatedAt: now,
        renamedAt: undefined
      })

      const secretName = 'my-secret-name'
      const res = await existsFormSecret(formId, secretName)

      expect(res.exists).toBe(true)
      // Verify repository was called with correct arguments
      const [formIdCalled, secretNameCalled] = jest.mocked(exists).mock.calls[0]
      expect(formId).toBe(formIdCalled)
      expect(secretName).toBe(secretNameCalled)
    })
  })

  describe('deleteFormSecret', () => {
    it('should delete form secret and publish audit event', async () => {
      jest.mocked(formMetadata.get).mockResolvedValue(formMetadataDocument)
      const publishEventSpy = jest.spyOn(publishBase, 'publishEvent')

      const secretName = 'my-secret-name'
      await deleteFormSecret(formId, secretName, defaultAuthor)

      // Verify repository was called with correct arguments
      const [formIdCalled, secretNameCalled] =
        jest.mocked(deleteSecret).mock.calls[0]
      expect(formId).toBe(formIdCalled)
      expect(secretName).toBe(secretNameCalled)

      // Verify audit event was published
      const [auditMessage] = publishEventSpy.mock.calls[0]
      expect(auditMessage).toMatchObject({
        type: AuditEventMessageType.FORM_SECRET_DELETED
      })
      expect(auditMessage.data).toMatchObject({
        formId,
        secretName: 'my-secret-name'
      })
    })

    it('should throw when error', async () => {
      jest.mocked(formMetadata.get).mockResolvedValue(formMetadataDocument)
      jest.mocked(deleteSecret).mockImplementationOnce(() => {
        throw new Error('Deleting error')
      })

      const secretName = 'my-secret-name'
      await expect(() =>
        deleteFormSecret(formId, secretName, defaultAuthor)
      ).rejects.toThrow('Deleting error')
    })
  })

  describe('renameFormSecret', () => {
    it('should rename form secret and publish audit event', async () => {
      jest.mocked(formMetadata.get).mockResolvedValue(formMetadataDocument)
      const publishEventSpy = jest.spyOn(publishBase, 'publishEvent')

      const secretNameBefore = 'my-secret-name-before'
      const secretNameAfter = 'my-secret-name-after'
      await renameFormSecret(
        formId,
        secretNameBefore,
        secretNameAfter,
        defaultAuthor
      )

      // Verify repository was called with correct arguments
      const [formIdCalled, secretNameBeforeCalled, secretNameAfterCalled] =
        jest.mocked(rename).mock.calls[0]
      expect(formId).toBe(formIdCalled)
      expect(secretNameBefore).toBe(secretNameBeforeCalled)
      expect(secretNameAfter).toBe(secretNameAfterCalled)

      // Verify audit event was published
      const [auditMessage] = publishEventSpy.mock.calls[0]
      expect(auditMessage).toMatchObject({
        type: AuditEventMessageType.FORM_SECRET_RENAMED
      })
      expect(auditMessage.data).toMatchObject({
        formId,
        secretName: 'my-secret-name-before',
        payload: {
          secretNameFrom: secretNameBefore,
          secretNameTo: secretNameAfter
        }
      })
    })

    it('should throw when error', async () => {
      jest.mocked(formMetadata.get).mockResolvedValue(formMetadataDocument)
      jest.mocked(rename).mockImplementationOnce(() => {
        throw new Error('Renaming error')
      })

      const secretNameBefore = 'my-secret-name-before'
      const secretNameAfter = 'my-secret-name-after'
      await expect(() =>
        renameFormSecret(
          formId,
          secretNameBefore,
          secretNameAfter,
          defaultAuthor
        )
      ).rejects.toThrow('Renaming error')
    })
  })

  describe('saveFormSecret', () => {
    it('should save form secret and publish audit event', async () => {
      jest.mocked(formMetadata.get).mockResolvedValue(formMetadataDocument)
      const publishEventSpy = jest.spyOn(publishBase, 'publishEvent')

      const secretName = 'my-secret-name'
      const secretValue = 'my-secret-value'
      await saveFormSecret(formId, secretName, secretValue, defaultAuthor)

      // Verify repository was called with correct arguments
      const [formIdCalled, secretNameCalled] = jest.mocked(save).mock.calls[0]
      expect(formId).toBe(formIdCalled)
      expect(secretName).toBe(secretNameCalled)
      // Omit secretValue as this gets encrypted

      // Verify audit event was published
      const [auditMessage] = publishEventSpy.mock.calls[0]
      expect(auditMessage).toMatchObject({
        type: AuditEventMessageType.FORM_SECRET_SAVED
      })
      expect(auditMessage.data).toMatchObject({
        formId,
        secretName: 'my-secret-name'
      })
    })

    it('should throw when error', async () => {
      jest.mocked(formMetadata.get).mockResolvedValue(formMetadataDocument)
      jest.mocked(save).mockImplementationOnce(() => {
        throw new Error('Saving error')
      })

      const secretName = 'my-secret-name'
      const secretValue = 'my-secret-value'
      await expect(() =>
        saveFormSecret(formId, secretName, secretValue, defaultAuthor)
      ).rejects.toThrow('Saving error')
    })
  })
})
