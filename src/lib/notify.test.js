import { postJson } from '~/src/lib/fetch.js'
import { escapeContent, sendNotification } from '~/src/lib/notify.js'

jest.mock('~/src/lib/fetch.js')

describe('Utils: Notify', () => {
  const templateId = 'example-template-id'
  const emailAddress = 'enrique.chase@defra.gov.uk'
  const personalisation = {
    subject: 'Hello',
    body: 'World'
  }

  describe('sendNotification', () => {
    it('calls postJson with personalised email payload', async () => {
      await sendNotification({
        templateId,
        emailAddress,
        personalisation
      })

      expect(postJson).toHaveBeenCalledWith(
        new URL(
          '/v2/notifications/email',
          'https://api.notifications.service.gov.uk'
        ),
        {
          payload: {
            template_id: templateId,
            email_address: emailAddress,
            personalisation
          },
          headers: {
            Authorization: expect.stringMatching(/^Bearer /)
          }
        }
      )
    })
  })

  describe('escapeContent', () => {
    it('should return empty string for null input', () => {
      // @ts-expect-error - testing invalid input
      expect(escapeContent(null)).toBe('')
    })

    it('should return empty string for undefined input', () => {
      // @ts-expect-error - testing invalid input
      expect(escapeContent(undefined)).toBe('')
    })

    it('should return empty string for non-string input', () => {
      // @ts-expect-error - testing invalid input
      expect(escapeContent(123)).toBe('')
      // @ts-expect-error - testing invalid input
      expect(escapeContent({})).toBe('')
    })

    it('should handle empty string input', () => {
      expect(escapeContent('')).toBe('')
    })

    it('should handle regular text without special characters', () => {
      expect(escapeContent('Hello World')).toBe('Hello World')
    })

    it('should escape hyphen at start of line with backslash', () => {
      expect(escapeContent('-list item')).toBe('\\-list item')
    })

    it('should escape asterisk at start of line with backslash', () => {
      expect(escapeContent('*bold start')).toBe('\\*bold start')
    })

    it('should escape hash at start of line with backslash', () => {
      expect(escapeContent('#heading')).toBe('\\#heading')
    })

    it('should replace tabs with 4 non-breaking spaces', () => {
      expect(escapeContent('before\tafter')).toBe(
        'before&nbsp;&nbsp;&nbsp;&nbsp;after'
      )
    })

    it('should replace spaces around hyphens with non-breaking spaces', () => {
      expect(escapeContent('word - word')).toBe('word&nbsp;-&nbsp;word')
    })

    it('should replace immediate spaces around hyphens with non-breaking spaces', () => {
      expect(escapeContent('word  -  word')).toBe('word &nbsp;-&nbsp; word')
    })

    it('should replace triple backticks on their own line with spaced backticks', () => {
      expect(escapeContent('```')).toBe('` ` `')
      expect(escapeContent('before\n```\nafter')).toBe('before\n` ` `\nafter')
    })

    it('should not replace triple backticks that are part of other content', () => {
      expect(escapeContent('some ``` code')).toBe('some ``` code')
    })

    it('should replace spaces before periods with non-breaking spaces', () => {
      expect(escapeContent('word .')).toBe('word&nbsp;.')
    })

    it('should replace spaces before commas with non-breaking spaces', () => {
      expect(escapeContent('word ,')).toBe('word&nbsp;,')
    })

    it('should insert space between ] and ( in markdown links', () => {
      expect(escapeContent('[text](url)')).toBe('[text] (url)')
    })

    it('should handle content with multiple rules applied', () => {
      expect(escapeContent('- item with - dash')).toBe(
        '\\- item with&nbsp;-&nbsp;dash'
      )
    })

    it('should handle multiline content with start-of-line characters', () => {
      expect(escapeContent('normal\n-list\n*bold\n#heading')).toBe(
        'normal\n\\-list\n\\*bold\n\\#heading'
      )
    })

    it('should not escape special characters in the middle of text', () => {
      expect(escapeContent('snake_case')).toBe('snake_case')
      expect(escapeContent('some*text*here')).toBe('some*text*here')
    })

    it('should handle HTML entity encoded markdown links', () => {
      expect(escapeContent('text&rsqb;&lpar;url')).toBe('text&rsqb; &lpar;url')
    })

    it('should escape single quotes with a backslash', () => {
      expect(escapeContent("it's")).toBe("it\\'s")
    })

    it('should escape double quotes with a backslash', () => {
      expect(escapeContent('say "hello"')).toBe('say \\"hello\\"')
    })

    it('should escape both single and double quotes', () => {
      expect(escapeContent(`"it's" a test`)).toBe(`\\"it\\'s\\" a test`)
    })

    it('should escape a backslash preceding a single quote', () => {
      // Input: it\'s (1 backslash before quote)
      // The backslash-quote is escaped to 4 backslashes + quote, then the quote gets escaped to backslash + quote
      // Result: it followed by 4 backslashes + backslash + quote + s = 5 backslashes before quote
      const input = "it\\'s"
      const result = escapeContent(input)
      expect(result).toBe("it\\\\\\\\\\'s")
    })

    it('should escape a backslash preceding a double quote', () => {
      // Input: say \"hello\" (1 backslash before each quote)
      const input = 'say \\"hello\\"'
      const result = escapeContent(input)
      expect(result).toBe('say \\\\\\\\\\"hello\\\\\\\\\\"')
    })

    it('should escape multiple backslash-quote sequences', () => {
      // Input: He said: \"it\'s fine\"
      const input = 'He said: \\"it\\\'s fine\\"'
      const result = escapeContent(input)
      expect(result).toBe('He said: \\\\\\\\\\"it\\\\\\\\\\\'s fine\\\\\\\\\\"')
    })

    it('should escape period after number at start of line', () => {
      expect(escapeContent('1.1 abc')).toBe('1\\.1 abc')
    })

    it('should escape period after number at start of line with no following content', () => {
      expect(escapeContent('3.')).toBe('3\\.')
    })

    it('should not escape period when space between number and period at start of line', () => {
      expect(escapeContent('1 . abc')).toBe('1&nbsp;. abc')
    })

    it('should not escape number-period sequence in the middle of text', () => {
      expect(escapeContent('abc 1.1 hello')).toBe('abc 1.1 hello')
    })

    it('should escape number-period on multiple lines', () => {
      expect(escapeContent('1. first\n2. second\n3. third')).toBe(
        '1\\. first\n2\\. second\n3\\. third'
      )
    })

    it('should escape multi-digit number followed by period at start of line', () => {
      expect(escapeContent('123.456')).toBe('123\\.456')
    })

    it('should escape hyphen with leading spaces', () => {
      expect(escapeContent('  - list item')).toBe('  \\- list item')
    })

    it('should escape hyphen with leading tab', () => {
      expect(escapeContent('\t- list item')).toBe(
        '&nbsp;&nbsp;&nbsp;&nbsp;\\- list item'
      )
    })

    it('should escape asterisk with leading spaces', () => {
      expect(escapeContent('   *bold')).toBe('   \\*bold')
    })

    it('should escape hash with leading spaces', () => {
      expect(escapeContent('  #heading')).toBe('  \\#heading')
    })

    it('should escape number-period with leading spaces', () => {
      expect(escapeContent('  1. item')).toBe('  1\\. item')
    })

    it('should escape number-period with leading tab', () => {
      expect(escapeContent('\t1. item')).toBe(
        '&nbsp;&nbsp;&nbsp;&nbsp;1\\. item'
      )
    })

    it('should escape indented numbered list across multiple lines', () => {
      expect(escapeContent('  1. first\n  2. second')).toBe(
        '  1\\. first\n  2\\. second'
      )
    })
  })
})
