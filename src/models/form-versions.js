import { idSchema } from '@defra/forms-model'
import Joi from 'joi'

export const formVersionByIdSchema = Joi.object({
  id: idSchema.required(),
  versionNumber: Joi.string().required()
}).required()
