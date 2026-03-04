const success = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({ code: statusCode, message, data });
};

const error = (res, message = 'Error', code = 500) => {
  res.status(code).json({ code, message });
};

module.exports = { success, error };
