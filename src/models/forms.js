import Joi from 'joi'

// Mongo id
export const idStringSchema = Joi.string().hex().length(24)

// Mongo id object
export const idObjectSchema = Joi.object().keys({
  id: Joi.any(),
  _bsontype: Joi.allow('ObjectId')
})

// Alternative Mongo id object
export const idSchema = Joi.alternatives(idStringSchema, idObjectSchema)

// Mongo id object params schema
export const idParamSchema = Joi.object()
  .keys({
    id: idStringSchema
  })
  .required()

// Create form payload schema
export const createFormSchema = Joi.object()
  .keys({
    title: Joi.string().required(),
    organisation: Joi.string().required(),
    teamName: Joi.string().required(),
    teamEmail: Joi.string().email().required()
  })
  .required()
