import { buildMetaData } from '@defra/forms-model/stubs'

import {
  buildDefinition,
  buildQuestionPage,
  buildTextFieldComponent
} from '~/src/api/forms/__stubs__/definition.js'
import { checkForMissingTranslations } from '~/src/api/forms/service/definition-helper.js'

describe('definition-helper', () => {
  describe('checkForMissingTranslations', () => {
    const metadata = buildMetaData()
    const definition = buildDefinition({
      pages: [
        buildQuestionPage({
          components: [
            buildTextFieldComponent({
              shortDescription: 'Short desc 1'
            })
          ]
        }),
        buildQuestionPage({
          components: [
            buildTextFieldComponent({
              id: '6020c3d7-bb2e-4ca0-9b43-44e43879b0e0',
              title: 'Text field 2',
              shortDescription: 'Short desc 2'
            })
          ]
        })
      ]
    })
    const allTranslations = {
      'form.title': 'welsh form title',
      'form.contact.email.address': 'abc-welsh@def.com',
      'form.contact.email.responseTime': 'welsh 2 days',
      'form.contact.online.url': 'http://welsh.com/abc',
      'form.contact.online.text': 'Welsh contacts',
      'form.contact.phone': 'Welsh telephone details',
      'form.submissionGuidance': 'Welsh what happens next',
      'form.privacyNoticeText': 'Welsh privacy text',
      'pages.ffefd409-f3f4-49fe-882e-6e89f44631b1.title': 'Welsh page title',
      'components.407dd0d7-cce9-4f43-8e1f-7d89cb698875.title':
        'Welsh component title',
      'components.407dd0d7-cce9-4f43-8e1f-7d89cb698875.shortDescription':
        'Welsh textfield 1 short desc',
      'components.6020c3d7-bb2e-4ca0-9b43-44e43879b0e0.title':
        'Welsh textfield title 2',
      'components.6020c3d7-bb2e-4ca0-9b43-44e43879b0e0.shortDescription':
        'Welsh textfield short desc 2'
    }
    it('should pass if no translations', () => {
      expect(() => {
        checkForMissingTranslations(metadata, definition)
      }).not.toThrow()
    })

    it('should throw if translations are out of sync with form', () => {
      const def = structuredClone(definition)
      const translations = structuredClone(allTranslations)
      // @ts-expect-error - dynamic delete
      delete translations[
        'components.407dd0d7-cce9-4f43-8e1f-7d89cb698875.title'
      ]
      def.metadata = {
        translations: {
          cy: translations
        }
      }
      expect(() => {
        checkForMissingTranslations(metadata, def)
      }).toThrow(
        'You have made changes to the form that have affected Welsh translations. You must re-save the Welsh translations.'
      )
    })

    it('should throw if at least one translation is empty (ignoring contact details for now)', () => {
      const def = structuredClone(definition)
      const translations = structuredClone(allTranslations)
      translations['components.407dd0d7-cce9-4f43-8e1f-7d89cb698875.title'] = ''
      def.metadata = {
        translations: {
          cy: translations
        }
      }
      expect(() => {
        checkForMissingTranslations(metadata, def)
      }).toThrow(
        'You must finish translating the whole form into Welsh before making this form live.'
      )
    })

    it('should throw if no contact info translations are completed', () => {
      const def = structuredClone(definition)
      const translations = structuredClone(allTranslations)
      translations['form.contact.email.address'] = ''
      translations['form.contact.email.responseTime'] = ''
      translations['form.contact.online.url'] = ''
      translations['form.contact.online.text'] = ''
      translations['form.contact.phone'] = ''
      def.metadata = {
        translations: {
          cy: translations
        }
      }
      expect(() => {
        checkForMissingTranslations(metadata, def)
      }).toThrow(
        'You must finish translating the whole form into Welsh before making this form live.'
      )
    })

    it('should pass if only one contact info translation set is completed - email only', () => {
      const def = structuredClone(definition)
      const translations = structuredClone(allTranslations)
      translations['form.contact.online.url'] = ''
      translations['form.contact.online.text'] = ''
      translations['form.contact.phone'] = ''
      def.metadata = {
        translations: {
          cy: translations
        }
      }
      const meta = structuredClone(metadata)
      meta.contact = {
        email: {
          address: 'abc@def.com',
          responseTime: 'Translated response time'
        }
      }
      expect(() => {
        checkForMissingTranslations(meta, def)
      }).not.toThrow()
    })

    it('should pass if only one contact info translation set is completed - online only', () => {
      const def = structuredClone(definition)
      const translations = structuredClone(allTranslations)
      translations['form.contact.email.address'] = ''
      translations['form.contact.email.responseTime'] = ''
      translations['form.contact.phone'] = ''
      def.metadata = {
        translations: {
          cy: translations
        }
      }
      const meta = structuredClone(metadata)
      meta.contact = {
        online: {
          url: 'https://contact-url.com',
          text: 'Translated text'
        }
      }
      expect(() => {
        checkForMissingTranslations(meta, def)
      }).not.toThrow()
    })

    it('should pass if only one contact info translation set is completed - phone only', () => {
      const def = structuredClone(definition)
      const translations = structuredClone(allTranslations)
      translations['form.contact.email.address'] = ''
      translations['form.contact.email.responseTime'] = ''
      translations['form.contact.online.url'] = ''
      translations['form.contact.online.text'] = ''
      def.metadata = {
        translations: {
          cy: translations
        }
      }
      const meta = structuredClone(metadata)
      meta.contact = {
        phone: 'Translated phone'
      }
      expect(() => {
        checkForMissingTranslations(meta, def)
      }).not.toThrow()
    })

    it('should throw if only one contact info translation set but missing translation - email only', () => {
      const def = structuredClone(definition)
      const translations = structuredClone(allTranslations)
      translations['form.contact.email.responseTime'] = ''
      def.metadata = {
        translations: {
          cy: translations
        }
      }
      const meta = structuredClone(metadata)
      meta.contact = {
        email: {
          address: 'abc@def.com',
          responseTime: 'Translated response time'
        }
      }
      expect(() => {
        checkForMissingTranslations(meta, def)
      }).toThrow(
        'You must finish translating the whole form into Welsh before making this form live.'
      )
    })

    it('should throw if only one contact info translation set but missing translation - online only', () => {
      const def = structuredClone(definition)
      const translations = structuredClone(allTranslations)
      translations['form.contact.online.text'] = ''
      def.metadata = {
        translations: {
          cy: translations
        }
      }
      const meta = structuredClone(metadata)
      meta.contact = {
        online: {
          url: 'https://contact-url.com',
          text: 'Translated text'
        }
      }
      expect(() => {
        checkForMissingTranslations(meta, def)
      }).toThrow(
        'You must finish translating the whole form into Welsh before making this form live.'
      )
    })

    it('should throw if only one contact info translation set but missing translation - phone only', () => {
      const def = structuredClone(definition)
      const translations = structuredClone(allTranslations)
      translations['form.contact.phone'] = ''
      def.metadata = {
        translations: {
          cy: translations
        }
      }
      const meta = structuredClone(metadata)
      meta.contact = {
        phone: 'Translated phone'
      }
      expect(() => {
        checkForMissingTranslations(meta, def)
      }).toThrow(
        'You must finish translating the whole form into Welsh before making this form live.'
      )
    })

    it('should pass if all contact translations are completed', () => {
      const def = structuredClone(definition)
      const translations = structuredClone(allTranslations)
      def.metadata = {
        translations: {
          cy: translations
        }
      }
      const meta = structuredClone(metadata)
      meta.contact = {
        email: {
          address: 'abc@def.com',
          responseTime: 'Translated response time'
        },
        online: {
          url: 'https://contact-url.com',
          text: 'Translated text'
        },
        phone: 'Translated phone'
      }
      expect(() => {
        checkForMissingTranslations(meta, def)
      }).not.toThrow()
    })
  })
})
