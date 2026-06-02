const errorHandler = require('../../../src/middleware/errorHandler');

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const makeReq = (path = '/test') => ({ path });

describe('errorHandler middleware', () => {
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = originalEnv; });

  it('returns 500 for errors without a statusCode', () => {
    const err = new Error('Something broke');
    const res = makeRes();
    errorHandler(err, makeReq(), res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('uses err.statusCode when provided', () => {
    const err = new Error('Not found'); err.statusCode = 404;
    const res = makeRes();
    errorHandler(err, makeReq(), res, () => {});
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Not found' }));
  });

  it('masks 500 messages in production', () => {
    process.env.NODE_ENV = 'production';
    const err = new Error('Secret DB details'); err.statusCode = 500;
    const res = makeRes();
    errorHandler(err, makeReq(), res, () => {});
    const body = res.json.mock.calls[0][0];
    expect(body.message).toBe('Internal Server Error');
    expect(body.stack).toBeUndefined();
  });

  it('includes stack trace outside production', () => {
    process.env.NODE_ENV = 'development';
    const err = new Error('Dev error'); err.stack = 'Error: Dev error\n    at test.js:1';
    const res = makeRes();
    errorHandler(err, makeReq(), res, () => {});
    const body = res.json.mock.calls[0][0];
    expect(body.message).toBe('Dev error');
    expect(body.stack).toBeTruthy();
  });

  it('shows specific message for non-500 errors in production', () => {
    process.env.NODE_ENV = 'production';
    const err = new Error('Validation failed'); err.statusCode = 422;
    const res = makeRes();
    errorHandler(err, makeReq(), res, () => {});
    expect(res.json.mock.calls[0][0].message).toBe('Validation failed');
  });
});
