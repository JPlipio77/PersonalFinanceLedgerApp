const { validationResult } = require('express-validator');
const { error } = require('../utils/apiResponse');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return error(res, 'Validation failed', 422, errors.array());
  }
  return next();
};

module.exports = validateRequest;
