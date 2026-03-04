const success = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({ code: statusCode, message, data });
};

const error = (res, message = 'Error', code = 500, data = null) => {
  const response = { code, message };
  if (data !== null) {
    response.data = data;
  }
  res.status(code).json(response);
};

module.exports = { success, error };
