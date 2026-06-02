const { error } = require('../utils/apiResponse');

const requireAuth = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return error(res, 'Unauthorized', 401);
};

module.exports = { requireAuth };
