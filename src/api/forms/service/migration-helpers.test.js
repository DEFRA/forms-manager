import { ControllerType, Engine } from '@defra/forms-model'
import { ValidationError } from 'joi'

import {
  buildDefinition,
  buildQuestionPage,
  buildStatusPage,
  buildSummaryPage,
  buildTextFieldComponent
} from '~/src/api/forms/__stubs__/definition.js'
import {
  applyPageTitles,
  convertDeclaration,
  migrateComponentFields,
  migrateToV2,
  populateComponentIds,
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

  const pageWithTwoComponents = buildQuestionPage({
    id: '73cf34ee-f53a-4159-9eef-b0286fd81934',
    components: [
      buildTextFieldComponent({
        id: '1c61fa1f-a8dc-463c-ade0-13aa7cbf4960'
      }),
      buildTextFieldComponent({
        id: '2aaafa1f-a8dc-463c-ade0-13aa7cbf1234'
      })
    ]
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

    it('should throw if there is some error in validation', () => {
      const partialDefinition = /** @type {Partial<FormDefinition>} */ {
        unknownProperty: true
      }
      // @ts-expect-error unknownProperty is not a valid property of formDefinition
      const invalidDefinition = buildDefinition(partialDefinition)
      expect(() => migrateToV2(invalidDefinition)).toThrow(
        new ValidationError('"unknownProperty" is not allowed', [], undefined)
      )
    })

    it('should not perform any changes if component and page ids exist', () => {
      const definition = buildDefinition({
        pages: [pageOneUndefinedId, pageTwoNoIds, summaryPageWithoutComponents],
        sections: [
          { hideTitle: false, name: 'section', title: 'Section title' }
        ]
      })

      const pages = /** @type {[PageQuestion, PageQuestion, Page]} */ (
        definition.pages
      )

      const components = /** @type {[ComponentDef, ComponentDef]} */ (
        pages[1].components
      )

      expect(migrateToV2(definition)).toMatchObject({
        ...definition,
        engine: Engine.V2,
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
  })

  describe('applyPageTitles', () => {
    const pages = /** @type {[PageQuestion, PageQuestion, Page]} */ ([
      pageOne,
      pageTwoNoIds,
      summaryPageWithoutComponents
    ])

    const definitionV1 = buildDefinition({
      pages,
      sections: [{ hideTitle: false, name: 'section', title: 'Section title' }],
      engine: Engine.V1
    })

    const pageOneModel = /** @type {PageQuestion} */ (definitionV1.pages[0])

    const pageTwoModel = /** @type {PageQuestion} */ (definitionV1.pages[1])

    it('should add page titles from first component per page', () => {
      pageOneModel.title = ''
      pageOneModel.components[0].title = 'Text field page 1'
      pageTwoModel.title = ''
      pageTwoModel.components[0].title = 'Text field page 2'
      const res = applyPageTitles(definitionV1)
      expect(res.pages[0].title).toBe('Text field page 1')
      expect(res.pages[1].title).toBe('Text field page 2')
    })

    it('should not add page titles if they already exist', () => {
      pageOneModel.title = 'Page title 1'
      pageOneModel.components[0].title = 'Text field page 1'
      pageTwoModel.title = 'Page title 2'
      pageTwoModel.components[0].title = 'Text field page 2'
      const res = applyPageTitles(definitionV1)
      expect(res.pages[0].title).toBe('Page title 1')
      expect(res.pages[1].title).toBe('Page title 2')
    })

    it('should leave page title to be blank if no applicable values', () => {
      pageOneModel.title = ''
      pageOneModel.components[0].title = ''
      pageTwoModel.title = ''
      pageTwoModel.components[0].title = ''
      const res = applyPageTitles(definitionV1)
      expect(res.pages[0].title).toBe('')
      expect(res.pages[1].title).toBe('')
    })

    it('should leave page title to be blank if no applicable components', () => {
      definitionV1.pages[0] = /** @type {PageStatus} */ {
        title: '',
        path: '/status1',
        controller: ControllerType.Status
      }
      definitionV1.pages[1] = /** @type {PageStatus} */ {
        title: '',
        path: '/status2',
        controller: ControllerType.Status
      }
      const res = applyPageTitles(definitionV1)
      expect(res.pages[0].title).toBe('')
      expect(res.pages[1].title).toBe('')
    })
  })

  describe('migrateComponentFields', () => {
    const testPages = /** @type {[PageQuestion, Page]} */ ([
      pageWithTwoComponents,
      summaryPageWithoutComponents
    ])

    const testDefinitionV1 = buildDefinition({
      pages: testPages,
      sections: [{ hideTitle: false, name: 'section', title: 'Section title' }],
      engine: Engine.V1
    })

    const pageModel = /** @type {PageQuestion} */ (testDefinitionV1.pages[0])
    pageModel.components[0].title = 'First title page 1 component 1'
    pageModel.components[1].title = 'Second title page 1 component 2'

    it('should add page titles from first component per page', () => {
      const res = migrateComponentFields(testDefinitionV1)
      const page1 = /** @type {PageQuestion} */ (res.pages[0])

      expect(page1.components[0]).toEqual({
        hint: '',
        id: '1c61fa1f-a8dc-463c-ade0-13aa7cbf4960',
        name: 'TextField',
        type: 'TextField',
        title: 'First title page 1 component 1',
        shortDescription: 'First title page 1 component 1',
        options: {},
        schema: {}
      })
      expect(page1.components[1]).toEqual({
        hint: '',
        id: '2aaafa1f-a8dc-463c-ade0-13aa7cbf1234',
        name: 'TextField',
        type: 'TextField',
        title: 'Second title page 1 component 2',
        shortDescription: 'Second title page 1 component 2',
        options: {},
        schema: {}
      })
    })
  })

  describe('convertDeclaration', () => {
    const testPages = /** @type {[PageQuestion, PageSummary]} */ ([
      pageWithTwoComponents,
      summaryPageWithoutComponents
    ])

    const testDefinitionV1 = buildDefinition({
      pages: testPages,
      sections: [{ hideTitle: false, name: 'section', title: 'Section title' }],
      engine: Engine.V1,
      declaration: 'Some declaration text'
    })

    it('should move declaration to guidance component', () => {
      const summaryPage = /** @type {PageQuestion} */ (
        testDefinitionV1.pages[1]
      )
      expect(summaryPage.components).toBeUndefined()
      expect(testDefinitionV1.declaration).toBe('Some declaration text')
      const res = convertDeclaration(testDefinitionV1)

      expect(res.declaration).toBeUndefined()

      const summaryPageRes = /** @type {PageQuestion} */ (res.pages[1])
      expect(summaryPageRes.components).toHaveLength(1)
      expect(summaryPageRes.components[0]).toEqual({
        content: 'Some declaration text',
        title: 'Markdown',
        name: 'Markdown',
        type: 'Markdown',
        options: {}
      })
    })

    it('should not create guidance component if declaration blank', () => {
      const testDefinition2 = buildDefinition({
        pages: [
          buildSummaryPage({
            id: summaryPageId
          })
        ],
        sections: [
          { hideTitle: false, name: 'section', title: 'Section title' }
        ],
        engine: Engine.V1,
        declaration: ''
      })

      const summaryPage = /** @type {PageQuestion} */ (testDefinition2.pages[0])
      expect(summaryPage).toBeDefined()
      expect(summaryPage.components).toBeUndefined()
      expect(testDefinition2.declaration).toBe('')
      const res = convertDeclaration(testDefinition2)

      const summaryPageRes = /** @type {PageQuestion} */ (res.pages[0])
      expect(summaryPageRes.components).toHaveLength(0)
      expect(res.declaration).toBe('')
    })

    it('should not create guidance component if declaration missing', () => {
      const testDefinition2 = buildDefinition({
        pages: [
          buildSummaryPage({
            id: summaryPageId
          })
        ],
        sections: [
          { hideTitle: false, name: 'section', title: 'Section title' }
        ],
        engine: Engine.V1
      })

      const summaryPage = /** @type {PageQuestion} */ (testDefinition2.pages[0])
      expect(summaryPage).toBeDefined()
      expect(summaryPage.components).toBeUndefined()
      expect(testDefinition2.declaration).toBeUndefined()
      const res = convertDeclaration(testDefinition2)

      const summaryPageRes = /** @type {PageQuestion} */ (res.pages[0])
      expect(summaryPageRes.components).toHaveLength(0)
      expect(res.declaration).toBeUndefined()
    })

    it('should throw if no summary page but a declaration', () => {
      const testDefinition3 = buildDefinition({
        pages: [],
        sections: [
          { hideTitle: false, name: 'section', title: 'Section title' }
        ],
        engine: Engine.V1,
        declaration: 'Some declaration'
      })

      expect(() => convertDeclaration(testDefinition3)).toThrow(
        'Cannot migrate declaration as unable to find Summary Page'
      )
    })
  })
})

/**
 * @import { PageQuestion, Page, PageSummary, ComponentDef } from '@defra/forms-model'
 */
