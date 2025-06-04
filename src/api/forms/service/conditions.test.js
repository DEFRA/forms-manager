import { ConditionType, OperatorName } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { pino } from 'pino'

import {
  buildCondition,
  buildDefinition,
  buildQuestionPage,
  buildTextFieldComponent
} from '~/src/api/forms/__stubs__/definition.js'
import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import { formMetadataDocument } from '~/src/api/forms/service/__stubs__/service.js'
import {
  addConditionToDraftFormDefinition,
  removeConditionOnDraftFormDefinition,
  updateConditionOnDraftFormDefinition
} from '~/src/api/forms/service/conditions.js'
import { getAuthor } from '~/src/helpers/get-author.js'
import { prepareDb } from '~/src/mongo.js'

jest.mock('~/src/helpers/get-author.js')
jest.mock('~/src/api/forms/repositories/form-definition-repository.js')
jest.mock('~/src/api/forms/repositories/form-metadata-repository.js')
jest.mock('~/src/api/forms/templates.js')
jest.mock('~/src/mongo.js')

jest.useFakeTimers().setSystemTime(new Date('2020-01-01'))

describe('conditions', () => {
  const id = '661e4ca5039739ef2902b214'
  const page1Id = '87ffdbd3-9e43-41e2-8db3-98ade26ca0b7'
  const page2Id = 'e3a1cb1e-8c9e-41d7-8ba7-719829bce84a'
  const component1Id = 'e296d931-2364-4b17-9049-1aa1afea29d3'
  const component2Id = '81f513ba-210f-4532-976c-82f8fc7ec2b6'
  const condition1Id = '6e4c2f74-5bd9-48b4-b991-f2a021dcde59'
  const condition2Id = '91c10139-a0dd-46a4-a2c5-4d7a02fdf923'
  const defaultAuthor = getAuthor()
  const dbMetadataSpy = jest.spyOn(formMetadata, 'updateAudit')

  const expectMetadataUpdate = () => {
    expect(dbMetadataSpy).toHaveBeenCalled()
    const [formId, author] = dbMetadataSpy.mock.calls[0]
    expect(formId).toBe(id)
    expect(author).toEqual(defaultAuthor)
  }

  const component1 = buildTextFieldComponent({
    id: component1Id
  })

  const page1 = buildQuestionPage({
    id: page1Id,
    title: 'Page One',
    path: '/page-one',
    components: [component1]
  })
  const component2 = buildTextFieldComponent({
    id: component2Id
  })
  const page2 = buildQuestionPage({
    id: page2Id,
    title: 'Page Two',
    path: '/page-two',
    components: [component2]
  })

  const condition1 = buildCondition({
    id: condition1Id,
    displayName: 'isEnriqueChase',
    items: [
      {
        id: '6746b15f-69f9-454c-a324-c62420069618',
        componentId: component1Id,
        operator: OperatorName.Is,
        value: {
          type: ConditionType.StringValue,
          value: 'Enrique Chase'
        }
      }
    ]
  })

  const condition2 = buildCondition({
    id: condition2Id,
    displayName: 'isJoanneBloggs',
    items: [
      {
        id: 'c73645b4-3ecf-4b00-bbee-de3bc465384d',
        componentId: component2Id,
        operator: OperatorName.Is,
        value: {
          type: ConditionType.StringValue,
          value: 'Joanne Bloggs'
        }
      }
    ]
  })

  const conditions = [condition1, condition2]

  const formDefinitionWithConditions = buildDefinition({
    pages: [page1, page2],
    conditions
  })

  beforeAll(async () => {
    await prepareDb(pino())
  })

  beforeEach(() => {
    jest.mocked(formMetadata.get).mockResolvedValue(formMetadataDocument)
  })

  describe('addConditionToDraftFormDefinition', () => {
    it('should add a condition to the form definition', async () => {
      jest
        .mocked(formDefinition.get)
        .mockResolvedValueOnce(formDefinitionWithConditions)

      const expectedCondition = buildCondition({
        id: 'a9fdbd20-df6c-42ef-b6ce-e72f7b76b069',
        displayName: 'isJoanneBloggsChase',
        items: [
          {
            id: '6746b15f-69f9-454c-a324-c62420069618',
            componentId: component1Id,
            operator: OperatorName.Is,
            value: {
              type: ConditionType.StringValue,
              value: 'Joanne Bloggs-Chase'
            }
          }
        ]
      })

      const addConditionMock = jest
        .mocked(formDefinition.addCondition)
        .mockResolvedValueOnce(expectedCondition)

      const result = await addConditionToDraftFormDefinition(
        id,
        expectedCondition,
        defaultAuthor
      )
      const [expectedFormId, conditionToInsert] = addConditionMock.mock.calls[0]
      expect(expectedFormId).toBe(id)
      expect(conditionToInsert).toEqual(expectedCondition)
      expect(result).toEqual(expectedCondition)
      expectMetadataUpdate()
    })
  })

  describe('updateConditionOnDraftFormDefinition', () => {
    it('should update a condition on the form definition', async () => {
      const conditionToUpdate = buildCondition({
        id: condition1Id,
        displayName: 'isNotEnriqueChase',
        items: [
          {
            id: '6746b15f-69f9-454c-a324-c62420069618',
            componentId: component1Id,
            operator: OperatorName.IsNot,
            value: {
              type: ConditionType.StringValue,
              value: 'Enrique Chase'
            }
          }
        ]
      })

      jest
        .mocked(formDefinition.get)
        .mockResolvedValueOnce(formDefinitionWithConditions)

      const updateListMock = jest
        .mocked(formDefinition.updateCondition)
        .mockResolvedValueOnce(conditionToUpdate)

      const result = await updateConditionOnDraftFormDefinition(
        id,
        condition1Id,
        conditionToUpdate,
        defaultAuthor
      )
      const [expectedFormId, expectedConditionId, expectedConditionToUpdate] =
        updateListMock.mock.calls[0]

      expect(expectedFormId).toBe(id)
      expect(expectedConditionId).toBe(condition1Id)
      expect(expectedConditionToUpdate).toEqual(conditionToUpdate)
      expect(result).toEqual(conditionToUpdate)
      expectMetadataUpdate()
    })
  })

  describe('removeConditionOnDraftFormDefinition', () => {
    it('should remove a condition on the form definition', async () => {
      await removeConditionOnDraftFormDefinition(
        id,
        condition1Id,
        defaultAuthor
      )
      const [expectedFormId, expectedConditionId] = jest.mocked(
        formDefinition.deleteCondition
      ).mock.calls[0]
      expect(expectedFormId).toBe(id)
      expect(expectedConditionId).toBe(condition1Id)
      expectMetadataUpdate()
    })

    it('should surface errors', async () => {
      const boomInternal = Boom.internal('Something went wrong')
      jest
        .mocked(formDefinition.deleteCondition)
        .mockRejectedValueOnce(boomInternal)
      await expect(
        removeConditionOnDraftFormDefinition(id, condition1Id, defaultAuthor)
      ).rejects.toThrow(boomInternal)
    })
  })
})
