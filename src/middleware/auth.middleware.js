// const jwt = require("jsonwebtoken");
// const userService = require("../services/user.service")
// const { BadRequest } = require("http-errors");

// const { JWT_SECRET } = process.env;

// exports.auth = async (req, res, next) =>  {
//   const token = req.header("Authorization")?.split(" ")[1];
//   if (!token) return res.status(401).send("Access denied.");
//   try {
//     const { _id } = jwt.verify(token, JWT_SECRET);
//     const user = await userService.getUserById(_id);
//     if (!user) throw new BadRequest('User not found')
//     req.user = user;
//     next();
//   } catch (ex) {
//     res.status(400).send("Invalid token");
//   }
// }
