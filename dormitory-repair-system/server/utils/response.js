const success = (res, data, message = 'Success') => {
  res.json({ code: 200, message, data });
};

const error = (res, message = 'Error', code = 500) => {
  res.status(code).json({ code, message });
};

module.exports = { success, error };
