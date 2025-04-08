module.exports = {
    name: 'user_id',
    description: 'Return telegram user id',

    async execute(ctx) {
        ctx.reply(`Telegram user id ${ctx.chat.id.toString()}`)
    }
};
