/**
 * =================================
 *          OLIVERBOT v2.0
 * =================================
 * A Discord bot created by mattdotcpp.
 * 
 * Uses CommonJS
 */

/**
 * BOT SPECIFIC IMPORTS
 */
 const CommandManager = require('./CommandManager.js');
 require('dotenv').config();

 /**
  * DISCORD.JS IMPORTS
  */
const { Client, Collection, Intents } = require('discord.js');


// Create the client and perform start up procedures.
const client = new Client({ intents: [Intents.FLAGS.GUILDS]});
CommandManager.initalizeCommands('./commands', true, './data');
CommandManager.pushSlashCommands('./data', null, false);

// Event listener, once the client is ready, perform the code within this function block.
client.once('ready', () => {
    console.log("[main.js] Oliverbot is ready!");

});

// Event listener, listens for commands.
client.on('interactionCreate', async interaction => {

  CommandManager.executeCommand(interaction);

});

// Log into Discord with token.
client.login(process.env.DISCORD_CLIENT_TOKEN);