const jwt = require("jsonwebtoken");
const userService = require("../services/user.service")
const { BadRequest } = require("http-errors");

const { JWT_SECRET } = process.env;

exports.auth = async (socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const { _id } = jwt.verify(token, JWT_SECRET);
    const user = await userService.getUserById(_id);
    if (!user) throw new BadRequest('User not found')
    user.socketId = socket.id;
    await user.save();  
    next();
  } catch (ex) {
    throw new BadRequest("Invalid token");
  }
}
