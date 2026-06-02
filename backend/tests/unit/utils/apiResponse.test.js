const { success, created, error, paginated } = require('../../../src/utils/apiResponse');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('apiResponse helpers', () => {
  test('success returns 200 with data', () => {
    const res = mockRes();
    success(res, { id: 1 }, 'OK');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'OK',
      data: { id: 1 },
    });
  });

  test('success with null data omits the data key', () => {
    const res = mockRes();
    success(res, null, 'Deleted');
    const body = res.json.mock.calls[0][0];
    expect(body).not.toHaveProperty('data');
    expect(body.message).toBe('Deleted');
  });

  test('created returns 201', () => {
    const res = mockRes();
    created(res, { id: 2 });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('error returns correct status and message', () => {
    const res = mockRes();
    error(res, 'Not Found', 404);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Not Found' });
  });

  test('error includes errors array when provided', () => {
    const res = mockRes();
    const errs = [{ field: 'amount', msg: 'required' }];
    error(res, 'Validation failed', 422, errs);
    const body = res.json.mock.calls[0][0];
    expect(body.errors).toEqual(errs);
  });

  test('paginated includes pagination metadata', () => {
    const res = mockRes();
    paginated(res, [1, 2, 3], { page: 1, total: 3 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [1, 2, 3],
      pagination: { page: 1, total: 3 },
    });
  });
});
