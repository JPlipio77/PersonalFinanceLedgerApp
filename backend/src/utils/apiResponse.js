const success = (res, data = null, message = 'Success', statusCode = 200) => {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  return res.status(statusCode).json(body);
};

const created = (res, data, message = 'Created') =>
  success(res, data, message, 201);

const error = (res, message = 'Internal Server Error', statusCode = 500, errors = null) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

const paginated = (res, data, pagination) =>
  res.status(200).json({ success: true, data, pagination });

module.exports = { success, created, error, paginated };
