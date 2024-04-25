import Joi from 'joi'

// Retrieve form by ID schema
export const formByIdSchema = Joi.object()
  .keys({
    id: Joi.string().hex().length(24)
  })
  .required()
