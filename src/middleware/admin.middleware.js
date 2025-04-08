
const admins = new Set(process.env.ADMIN_USER_IDS.split(',').map(id => id.trim()));

exports.checkIfAdmin = async (userId) => {
    return admins.has(String(userId));
}

exports.isAdmin = async (ctx, next) => {
    const userId = ctx.from.id;
    const isAdmin = await this.checkIfAdmin(userId);

    if (!isAdmin) {
        return ctx.reply("❌ You are not authorized to access this command.");
    }

    return true;
};

exports.commandHandleAdmin = async (ctx) => {
    const userId = ctx.from.id;
    const isAdmin = await this.checkIfAdmin(userId);

    return isAdmin;
}