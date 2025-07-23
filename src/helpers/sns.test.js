import { publishEvent } from '~/src/helpers/publish.js'
import { listTopics } from '~/src/helpers/sns.js'

describe('listTopics', () => {
  test('returns topics', async () => {
    const topics = await listTopics()

    expect(topics.Topics).toHaveLength(2)
  })
})

describe('publishEvent', () => {
  test('published event', async () => {
    const output = await publishEvent(JSON.stringify({ a: 1, b: 'foo' }))

    expect(output).toBeDefined()
    expect(output.MessageId).toBeDefined()
  })
})
