const { CommandoClient } = require('discord.js-commando');

const path = require('path');

// Bot required files and modules
const CONFIG = require('./sys/config.json');
var CommandManager = require('./sys/managers/CommandManager');

// constant client variable
const client = new CommandoClient({
    commandPrefix: CONFIG.OLIVERBOT.prefix,
    owner: CONFIG.OLIVERBOT.ownerID,
    invite: CONFIG.OLIVERBOT.invite,
});

CommandManager.test();
CommandManager.register(client, path.join(__dirname, 'sys/commands'));

client.once('ready', () => {

    console.log(`[index.js] Logged in successfully as ${client.user.tag}! (${client.user.id})`);
    client.user.setActivity(`with Matt`);
});

// Login token
client.login(CONFIG.OLIVERBOT.token);