const { validationResult } = require('express-validator');
const validateRequest = require('../../../src/middleware/validateRequest');

jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

describe('validateRequest middleware', () => {
  it('calls next() when no validation errors', () => {
    validationResult.mockReturnValue({ isEmpty: () => true });
    const next = jest.fn();
    validateRequest({}, makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 422 with errors when validation fails', () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'amount is required', path: 'amount' }],
    });
    const res = makeRes();
    const next = jest.fn();
    validateRequest({}, res, next);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(next).not.toHaveBeenCalled();
  });
});
