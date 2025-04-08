const { checkUserRegitered } = require("../handlers/user.handler");
const User = require("../models/User");

module.exports = {
    name: 'login',
    description: 'User login',

    async execute(ctx) {
        const userId = ctx.from.id;
        const isRegistered = await checkUserRegitered(userId);
        if (isRegistered) {
            return await ctx.reply("Already registered user");
        }
        ctx.session.waitingForPassword = true;
        return await ctx.reply("Enter your password to login");
    }
};

