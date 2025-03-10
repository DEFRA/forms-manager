import { Engine } from '@defra/forms-model'

import {
  buildDefinition,
  buildQuestionPage,
  buildStatusPage,
  buildSummaryPage,
  buildTextFieldComponent
} from '~/src/api/forms/__stubs__/definition.js'
import {
  migrateToV2,
  populateComponentIds,
  populateDefinitionIds,
  repositionSummary,
  summaryHelper
} from '~/src/api/forms/service/migration-helpers.js'

describe('migration helpers', () => {
  const summaryPageId = '449a45f6-4541-4a46-91bd-8b8931b07b50'

  const summaryPageWithoutComponents = buildSummaryPage({
    id: summaryPageId
  })

  const componentWithoutAnId = buildTextFieldComponent({
    name: 'CwAid'
  })
  delete componentWithoutAnId.id

  const componentOne = buildTextFieldComponent({
    id: '380429e0-2d2d-4fbf-90fb-34364f488af1',
    name: 'CwAid1'
  })
  const componentTwo = buildTextFieldComponent({
    id: '52e34be1-a528-4e10-a5eb-06aed317fb7f',
    name: 'CwAid2'
  })
  const componentOneNoId = buildTextFieldComponent({
    ...componentOne,
    id: undefined
  })
  const componentTwoNoId = buildTextFieldComponent({
    ...componentTwo
  })
  delete componentTwoNoId.id

  const pageOne = buildQuestionPage({
    id: '73cf34ee-f53a-4159-9eef-b0286fd81934',
    components: [
      buildTextFieldComponent({
        id: '1c61fa1f-a8dc-463c-ade0-13aa7cbf4960'
      })
    ]
  })

  const pageTwo = buildQuestionPage({
    id: 'c7766963-fd9d-4ad9-90a7-88b0ef856b76',
    title: 'Page two',
    path: '/path-two',
    components: [componentOne, componentTwo]
  })

  const pageOneUndefinedId = buildQuestionPage({
    ...pageOne,
    id: undefined
  })
  const pageTwoNoIds = buildQuestionPage({
    ...pageTwo,
    components: [componentOneNoId, componentTwoNoId]
  })
  delete pageTwoNoIds.id
  const formDefinitionV1 = buildDefinition({
    engine: Engine.V1,
    pages: [pageOne, pageTwo, summaryPageWithoutComponents],
    sections: [{ hideTitle: false, name: 'section', title: 'Section title' }]
  })

  describe('summaryHelper', () => {
    it('should push the summary to the end if it not in the correct place', () => {
      const definition = buildDefinition({
        pages: [summaryPageWithoutComponents, pageOneUndefinedId]
      })
      expect(summaryHelper(definition)).toEqual({
        indexOf: 0,
        shouldRepositionSummary: true,
        summaryExists: true,
        summary: summaryPageWithoutComponents
      })
    })

    it('should not push summary to the end if it is in the correct place', () => {
      const definition = buildDefinition({
        pages: [pageOneUndefinedId, summaryPageWithoutComponents]
      })
      expect(summaryHelper(definition)).toEqual({
        indexOf: 1,
        shouldRepositionSummary: false,
        summaryExists: true,
        summary: summaryPageWithoutComponents
      })
    })

    it('should not push summary to the end if no pages', () => {
      const definition = buildDefinition({
        pages: []
      })
      expect(summaryHelper(definition)).toEqual({
        indexOf: -1,
        shouldRepositionSummary: false,
        summaryExists: false,
        summary: undefined
      })
    })

    it('should not push summary to the end if summary page does not exist', () => {
      const definition = buildDefinition({
        pages: [pageOneUndefinedId]
      })
      expect(summaryHelper(definition)).toEqual({
        indexOf: -1,
        shouldRepositionSummary: false,
        summaryExists: false,
        summary: undefined
      })
    })
  })

  describe('repositionSummary', () => {
    const expectedDefinition = buildDefinition({
      pages: [pageOneUndefinedId, summaryPageWithoutComponents]
    })

    it('should move definition to the end if it is not in place', () => {
      const definition1 = buildDefinition({
        pages: [summaryPageWithoutComponents, pageOneUndefinedId]
      })

      expect(repositionSummary(definition1)).toEqual(expectedDefinition)
    })

    it('should no change the order if summary is in the correct place', () => {
      const definition1 = buildDefinition({
        pages: [pageOneUndefinedId, summaryPageWithoutComponents]
      })
      const definition2 = buildDefinition({
        pages: []
      })
      const definition3 = buildDefinition({
        pages: [pageOneUndefinedId]
      })

      expect(repositionSummary(definition1)).toEqual(expectedDefinition)
      expect(repositionSummary(definition2)).toEqual(definition2)
      expect(repositionSummary(definition3)).toEqual(definition3)
    })
  })

  describe('populateComponentIds', () => {
    it('should return unchanged if no components in page', () => {
      const testPage = buildQuestionPage()
      const page = populateComponentIds(testPage)
      expect(page).toEqual(testPage)
    })

    it('should return unchanged if page is not one with components', () => {
      const testPage = buildStatusPage({})
      const page = populateComponentIds(testPage)
      expect(page).toEqual(testPage)
    })

    it('should return unchanged if page has a component but component already has id', () => {
      const testPage = buildQuestionPage({
        components: [
          buildTextFieldComponent({
            id: 'f0449907-e3fe-4c9e-a954-dc4f8ae778f8'
          })
        ]
      })
      const page = populateComponentIds(testPage)
      expect(page).toEqual(testPage)
    })

    it('should return populated if page has a component where component has no id', () => {
      const testPage = buildQuestionPage({
        components: [componentWithoutAnId]
      })
      expect(testPage.components[0].id).toBeUndefined()
      const page = /** @type {PageQuestion} */ (populateComponentIds(testPage))
      expect(page.components[0].id).toBeDefined()
    })
  })

  describe('populateDefinitionIds', () => {
    it('should add page and component ids if they are missing', () => {
      const definition = buildDefinition({
        pages: [pageOneUndefinedId, pageTwoNoIds, summaryPageWithoutComponents],
        sections: [
          { hideTitle: false, name: 'section', title: 'Section title' }
        ]
      })

      const pages = /** @type {[PageQuestion, PageQuestion, Page]} */ (
        formDefinitionV1.pages
      )

      const components = /** @type {[ComponentDef, ComponentDef]} */ (
        pages[1].components
      )

      expect(populateDefinitionIds(definition)).toMatchObject({
        ...formDefinitionV1,
        pages: [
          {
            ...pages[0],
            id: expect.any(String)
          },
          {
            ...pages[1],
            id: expect.any(String),
            components: [
              {
                ...components[0],
                id: expect.any(String)
              },
              {
                ...components[1],
                id: expect.any(String)
              }
            ]
          },
          {
            ...pages[2],
            id: expect.any(String)
          }
        ]
      })
    })
    it('should not perform any changes if component and page ids exist', () => {
      expect(populateDefinitionIds(formDefinitionV1)).toMatchObject(
        formDefinitionV1
      )
    })
  })

  describe('migrateToV2', () => {
    const pages = /** @type {[Page, PageQuestion, PageQuestion]} */ ([
      summaryPageWithoutComponents,
      pageOneUndefinedId,
      pageTwoNoIds
    ])

    const components = /** @type {[ComponentDef, ComponentDef]} */ (
      pages[2].components
    )
    const definitionV1 = buildDefinition({
      pages,
      sections: [{ hideTitle: false, name: 'section', title: 'Section title' }],
      engine: Engine.V1
    })

    const definitionV2 = buildDefinition({
      pages: [
        {
          ...pages[1],
          id: expect.any(String)
        },
        {
          ...pages[2],
          id: expect.any(String),
          components: [
            {
              ...components[0],
              id: expect.any(String)
            },
            {
              ...components[1],
              id: expect.any(String)
            }
          ]
        },
        {
          ...pages[0],
          id: expect.any(String)
        }
      ],
      sections: [{ hideTitle: false, name: 'section', title: 'Section title' }],
      engine: Engine.V2
    })

    it('should migrate to version v2', () => {
      expect(migrateToV2(definitionV1)).toMatchObject(definitionV2)
    })
  })
})

/**
 * @import { PageQuestion, Page, ComponentDef } from '@defra/forms-model'
 */
