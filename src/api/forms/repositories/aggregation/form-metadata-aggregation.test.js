import {
  addDateFieldStage,
  addRankingStage,
  addSortingStage,
  buildAggregationPipeline,
  buildFilterConditions
} from '~/src/api/forms/repositories/aggregation/form-metadata-aggregation.js'

describe('Form metadata aggregation', () => {
  /** @type {PipelineStage[]} */
  let pipeline

  beforeEach(() => {
    pipeline = []
  })

  describe('buildFilterConditions', () => {
    describe('with empty title', () => {
      it('should return empty conditions', () => {
        const result = buildFilterConditions('')
        expect(result).toEqual({})
      })
    })

    describe('with simple title', () => {
      it('should create case-insensitive regex filter', () => {
        const result = buildFilterConditions('Test Form')
        expect(result).toEqual({
          title: { $regex: /Test Form/i }
        })
      })
    })

    describe('with special characters in title', () => {
      it('should escape special regex characters', () => {
        const result = buildFilterConditions('Form (test)')
        expect(result).toEqual({
          title: { $regex: /Form \(test\)/i }
        })
      })
    })
  })

  describe('buildAggregationPipeline', () => {
    describe('without title', () => {
      it('should build pipeline with default sorting', () => {
        const { pipeline, aggOptions } = buildAggregationPipeline(
          'updatedAt',
          'desc',
          ''
        )

        expect(pipeline).toHaveLength(3)
        expect(aggOptions).toEqual({
          collation: { locale: 'en', strength: 1 }
        })
      })
    })

    describe('with title', () => {
      it('should include match stage in pipeline', () => {
        const { pipeline, aggOptions } = buildAggregationPipeline(
          'updatedAt',
          'desc',
          'Test'
        )

        expect(pipeline[0]).toHaveProperty('$match')
        expect(pipeline).toHaveLength(4)
        expect(aggOptions).toEqual({
          collation: { locale: 'en', strength: 1 }
        })
      })
    })

    describe('with title sorting', () => {
      it('should include collation options', () => {
        const { aggOptions } = buildAggregationPipeline('title', 'asc', '')

        expect(aggOptions).toEqual({
          collation: { locale: 'en', strength: 1 }
        })
      })
    })
  })

  describe('addRankingStage', () => {
    describe('without title', () => {
      it('should add default matchScore', () => {
        addRankingStage(pipeline, '')

        expect(pipeline).toHaveLength(1)
        expect(pipeline[0].$addFields).toEqual({
          matchScore: 0
        })
      })
    })

    describe('with title', () => {
      it('should add ranking logic', () => {
        addRankingStage(pipeline, 'Test Form')

        expect(pipeline).toHaveLength(1)
        const addFields = /** @type {PipelineStage} */ (pipeline[0])
        const matchScore = /** @type {AddFieldsSwitch} */ (
          addFields.$addFields?.matchScore
        )
        expect(matchScore).toHaveProperty('$switch')
        expect(matchScore.$switch.branches).toHaveLength(3)
      })
    })

    describe('with numeric title', () => {
      it('should handle numeric or mixed title gracefully', () => {
        addRankingStage(pipeline, '12345')
        const addFields = pipeline[0].$addFields
        expect(addFields?.matchScore).toBeDefined()
      })
    })
  })

  describe('addDateFieldStage', () => {
    it('should add date formatting stage', () => {
      addDateFieldStage(pipeline)

      expect(pipeline).toHaveLength(1)
      expect(pipeline[0].$addFields).toEqual({
        updatedDateOnly: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$updatedAt',
            timezone: 'UTC'
          }
        }
      })
    })
  })

  describe('addSortingStage', () => {
    describe('with title sort', () => {
      it('should add title sort with collation', () => {
        const collation = addSortingStage(pipeline, 'title', 'asc')

        expect(pipeline[0].$sort).toEqual({
          title: 1,
          updatedDateOnly: -1,
          'updatedBy.displayName': 1
        })
        expect(collation).toEqual({ locale: 'en', strength: 1 })
      })
    })

    describe('with updatedAt sort', () => {
      it('should add updatedAt sort', () => {
        const collation = addSortingStage(pipeline, 'updatedAt', 'desc')

        expect(pipeline[0].$sort).toEqual({
          updatedDateOnly: -1,
          'updatedBy.displayName': 1
        })
        expect(collation).toEqual({ locale: 'en', strength: 1 })
      })
    })

    describe('with unknown sort field', () => {
      it('should add default sort', () => {
        const collation = addSortingStage(pipeline, 'unknown', 'desc')

        expect(pipeline[0].$sort).toEqual({
          updatedDateOnly: -1,
          'updatedBy.displayName': 1
        })
        expect(collation).toEqual({ locale: 'en', strength: 1 })
      })
    })
  })
})

/**
 * @import { AddFieldsSwitch, PipelineStage } from '~/src/api/forms/repositories/aggregation/types.js'
 */
