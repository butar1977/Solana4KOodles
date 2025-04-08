const { isHttpError } = require("http-errors");

module.exports = function (err, req, res, next) {
  if (isHttpError(err)) {
    return res.status(err.status).send({ error: err });
  }

  res
    .status(500)
    .send({
      error: { message: "Internal Server Error", description: err.message },
    });

  next(err);
};  