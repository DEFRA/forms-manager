import { Engine, SchemaVersion } from '@defra/forms-model'
import {
  buildDefinition,
  buildQuestionPage,
  buildSummaryPage,
  buildTextFieldComponent
} from '@defra/forms-model/stubs'
import Boom from '@hapi/boom'
import { pino } from 'pino'

import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import * as migrationHelperStubs from '~/src/api/forms/service/migration-helpers.js'
import { migrateDefinitionToV2 } from '~/src/api/forms/service/migration.js'
import { getAuthor } from '~/src/helpers/get-author.js'
import { publishFormMigratedEvent } from '~/src/messaging/publish.js'
import { prepareDb } from '~/src/mongo.js'

jest.mock('~/src/helpers/get-author.js')
jest.mock('~/src/api/forms/repositories/form-definition-repository.js')
jest.mock('~/src/api/forms/repositories/form-metadata-repository.js')
jest.mock('~/src/mongo.js')
jest.mock('~/src/api/forms/service/versioning.js')
jest.mock('~/src/messaging/publish.js')

jest.useFakeTimers().setSystemTime(new Date('2020-01-01'))

const author = getAuthor()

describe('migration', () => {
  const id = '661e4ca5039739ef2902b214'
  const v4Id = '083f2f65-7c1d-48e0-a195-3f6b0836ad08'

  const summaryWithoutId = buildSummaryPage()
  delete summaryWithoutId.id
  const summaryWithId = buildSummaryPage({
    id: v4Id
  })
  const componentWithoutId = buildTextFieldComponent({
    id: undefined,
    name: 'CWId'
  })
  const componentWithId = buildTextFieldComponent({
    ...componentWithoutId,
    id: '17f791b5-ecef-40a3-a4c5-e1865f7f3aea'
  })
  const questionPageWithoutId = buildQuestionPage({
    components: [componentWithoutId]
  })
  delete questionPageWithoutId.id

  const questionPageWithId = buildQuestionPage({
    ...questionPageWithoutId,
    id: '20d966ab-b926-449a-ad86-9236d44980ab'
  })
  const questionPageWithIdAndComponentIds = buildQuestionPage({
    ...questionPageWithId,
    components: [componentWithId]
  })

  const versionOne = buildDefinition({
    pages: [summaryWithoutId, questionPageWithoutId],
    engine: Engine.V1
  })
  const versionTwo = buildDefinition({
    pages: [questionPageWithIdAndComponentIds, summaryWithId],
    schema: SchemaVersion.V2,
    engine: Engine.V2
  })

  const dbMetadataSpy = jest.spyOn(formMetadata, 'updateAudit')
  const expectMetadataUpdate = () => {
    expect(dbMetadataSpy).toHaveBeenCalled()
    const [formId, updateFilter] = dbMetadataSpy.mock.calls[0]
    expect(formId).toBe(id)
    expect(updateFilter).toEqual(author)
  }

  beforeAll(async () => {
    await prepareDb(pino())
  })

  describe('migrateDefinitionToV2', () => {
    const getMock = jest
      .mocked(formDefinition.get)
      .mockResolvedValue(versionOne)

    it('should migrate a v1 definition to v2', async () => {
      const updateMock = jest.mocked(formDefinition.update)
      const auditMock = jest.mocked(publishFormMigratedEvent)

      jest
        .spyOn(migrationHelperStubs, 'migrateToV2')
        .mockReturnValueOnce(versionTwo)

      getMock.mockResolvedValueOnce(versionOne)

      const updatedDefinition = await migrateDefinitionToV2(id, author)

      expect(updateMock).toHaveBeenCalled()
      const [finalExpectedId, finalExpectedDefinition] =
        updateMock.mock.calls[0]

      expect(finalExpectedId).toBe(id)
      expect(finalExpectedDefinition).toEqual(versionTwo)

      expectMetadataUpdate()
      expect(updatedDefinition).toEqual(versionTwo)
      expect(auditMock).toHaveBeenCalledTimes(1)
    })

    it('should do nothing if definition is v2 already', async () => {
      jest.mocked(formDefinition.get).mockResolvedValue(versionTwo)
      const definition = await migrateDefinitionToV2(id, author)
      expect(definition).toEqual(versionTwo)
      expect(formDefinition.get).toHaveBeenCalledTimes(1)
      expect(formDefinition.update).not.toHaveBeenCalled()
      expect(dbMetadataSpy).not.toHaveBeenCalled()
    })

    it('should surface errors correctly', async () => {
      jest.mocked(formDefinition.get).mockResolvedValue(versionOne)
      jest
        .mocked(formDefinition.update)
        .mockRejectedValueOnce(Boom.internal('err'))
      await expect(migrateDefinitionToV2(id, author)).rejects.toThrow(
        Boom.internal('err')
      )
    })
  })
})
