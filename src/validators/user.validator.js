const Joi = require("joi");

exports.validateUser = (user) => {
  return Joi.object({
    name: Joi.string().required(),
    telegramId: Joi.number().required(),
    username: Joi.string().required(),
  }).validate(user);
};
