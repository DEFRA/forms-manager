import { ControllerPath, ControllerType, Engine, SchemaVersion } from '@defra/forms-model'

/**
 * Function to return an empty form (V2)
 */
export function empty() {
  return /** @satisfies {FormDefinition} */ ({
    name: '',
    engine: Engine.V2,
    schema: SchemaVersion.V2,
    startPage: ControllerPath.Summary,
    pages: [
      {
        title: 'Summary',
        path: ControllerPath.Summary,
        controller: ControllerType.Summary
      }
    ],
    conditions: [],
    sections: [],
    lists: []
  })
}

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
