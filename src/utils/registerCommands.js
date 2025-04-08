const path = require('node:path');
const fs = require('node:fs');

module.exports = async (
  bot,
  commandDir = path.join(__dirname, '..', 'commands')
) => {
  const excludedFromListing = new Set(['admin_panel', 'login']); 

  const commands = fs
    .readdirSync(commandDir)
    .filter((file) => file.endsWith('.command.js'))
    .map((file) => require(path.join(commandDir, file)));

  commands.forEach((command) => {
    bot.command(command.name, command.execute);
  });

  const botCommands = commands
    .filter(({ name }) => !excludedFromListing.has(name)) 
    .map(({ name: command, description }) => ({ command, description }));

  await bot.api.setMyCommands(botCommands); 
  return commands;
};
