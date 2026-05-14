const expectedBaseSummaryMetrics = {
  conditions: 0,
  features: [],
  organisation: 'Defra',
  pages: 1,
  questionTypes: 0,
  sections: 1
}

/**
 * @param {Date} timestamp
 */
export function getExpectedOverviewMetrics(timestamp) {
  return {
    draft: {
      '449a699bcc9946a6a6d925de': {
        type: 'overview-metric',
        formId: '449a699bcc9946a6a6d925de',
        formStatus: 'draft',
        summaryMetrics: {
          ...expectedBaseSummaryMetrics,
          name: 'Form 1 title',
          slug: 'form-1-title',
          status: 'draft'
        },
        featureMetrics: {
          features: { Sections: 1 },
          formStructure: {
            conditions: 0,
            pages: 1,
            questionTypes: 0,
            questions: 0,
            sections: 1
          },
          questionTypes: {}
        },
        submissionsCount: 0,
        updatedAt: timestamp
      },
      '0dae1c832b8e4a89963a7825': {
        type: 'overview-metric',
        formId: '0dae1c832b8e4a89963a7825',
        formStatus: 'live',
        summaryMetrics: {
          ...expectedBaseSummaryMetrics,
          name: 'Form 2 title',
          slug: 'form-2-title',
          status: 'draft'
        },
        featureMetrics: {
          features: { Sections: 1 },
          formStructure: {
            conditions: 0,
            pages: 1,
            questionTypes: 0,
            questions: 0,
            sections: 1
          },
          questionTypes: {}
        },
        submissionsCount: 0,
        updatedAt: timestamp
      },
      '9fb48bd350a64e908c9ea92e': {
        type: 'overview-metric',
        formId: '9fb48bd350a64e908c9ea92e',
        formStatus: 'draft',
        summaryMetrics: {
          ...expectedBaseSummaryMetrics,
          name: 'Form 3 title',
          slug: 'form-3-title',
          status: 'draft',
          sections: 0
        },
        featureMetrics: {
          features: {},
          formStructure: {
            conditions: 0,
            pages: 1,
            questionTypes: 0,
            questions: 0,
            sections: 0
          },
          questionTypes: {}
        },
        submissionsCount: 0,
        updatedAt: timestamp
      }
    },
    live: {
      '0dae1c832b8e4a89963a7825': {
        type: 'overview-metric',
        formId: '0dae1c832b8e4a89963a7825',
        formStatus: 'live',
        summaryMetrics: {
          ...expectedBaseSummaryMetrics,
          name: 'Form 2 title',
          slug: 'form-2-title',
          status: 'live'
        },
        featureMetrics: {
          features: { Sections: 1 },
          formStructure: {
            conditions: 0,
            pages: 1,
            questionTypes: 0,
            questions: 0,
            sections: 1
          },
          questionTypes: {}
        },
        submissionsCount: 0,
        updatedAt: timestamp
      }
    }
  }
}

/**
 * Generate expected metrics for 8th August 2025
 */
export function getExpectedTimelineMetrics1() {
  return {
    timeline: [
      {
        type: 'timeline-metric',
        formId: '449a699bcc9946a6a6d925de',
        formStatus: 'draft',
        metricName: 'NewFormsCreated',
        metricValue: 1,
        createdAt: new Date('2025-05-07T08:22:28.035Z')
      },
      {
        type: 'timeline-metric',
        formId: '0dae1c832b8e4a89963a7825',
        formStatus: 'draft',
        metricName: 'NewFormsCreated',
        metricValue: 1,
        createdAt: new Date('2025-05-07T08:22:28.035Z')
      },
      {
        type: 'timeline-metric',
        formId: '0dae1c832b8e4a89963a7825',
        formStatus: 'live',
        metricName: 'FormsPublished',
        metricValue: 1,
        createdAt: new Date('2025-05-07T09:10:21.035Z')
      },
      {
        type: 'timeline-metric',
        formId: '9fb48bd350a64e908c9ea92e',
        formStatus: 'draft',
        metricName: 'NewFormsCreated',
        metricValue: 1,
        createdAt: new Date('2025-05-07T08:22:28.035Z')
      }
    ]
  }
}

/**
 * Generate expected metrics for 7th May 2025
 */
export function getExpectedTimelineMetrics2() {
  return {
    timeline: [
      {
        type: 'timeline-metric',
        formId: '0dae1c832b8e4a89963a7825',
        formStatus: 'live',
        metricName: 'FormsPublished',
        metricValue: 1,
        createdAt: new Date('2025-08-08T09:10:21.035Z')
      }
    ]
  }
}
