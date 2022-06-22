const { Collection, Client, Interaction } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const fs = require('fs');
const path = require('path');

let globalCommandCollection = new Collection();

/**
 * @module CommandManager
 * @author Matt De Binion <MattD#0001>
 * @description CommandManager is a management file that interacts with the bot to provide command functionaity such as:
 * 
 *  - Adding, removing, and updating commands
 *  - Deploying slash commands to all servers.
 *  - Running commands asychronously.
 * 
 * @version 0.2.0
 * ---
 * This file requires the following modules in addition to being connected to the Discord API with a valid token:
 * 
 * @requires discord.js
 * @requires discordjs/rest
 * @requires discord-api-types/v9
 * @requires fs
 * @requires path
 */
module.exports = {

    /**
     * @function executeCommand
     * @description Given an interaction, executes a command if it exists.
     * ---
     * @param {Interaction} interaction An Interaction.
     */
    executeCommand: async (interaction) => {

        if(!interaction.isCommand()) return;

        const command = globalCommandCollection.get(interaction.commandName + '.js'); // Appears to have appended .js when syncing to global command list, lazy to fix so here's a quick fix.

        if(!command) return;
        
        try {
            await command.run(interaction);
        } catch (error) {

            console.log('[CommandManager.js] An error has occured executing a command: ' + error);
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    },

    /**
     * @function clearSlashCommands
     * @description Clears all slash commands within the development server OR globally. This is intended to remove erratic behavior of pushing slash commands over and over again.
     * ---
     * @param {globalConfigs.json} globalConfigs The `globalConfigs.json` file.
     * @param {boolean} globally 
     */
    clearSlashCommands: (globalConfigs, globally = false) => {

        const rest = new REST({ version: '9'}).setToken(process.env.TOKEN);

        (async () => {

            try {
                console.log('[CommandManager.js] Clearing slash commands...');

                await rest.put(
                    Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_PRIMARY_GUILD_ID),
                    { body: {} },
                );

                console.log('[CommandManager.js] Successfully cleared slash commands.');
            } catch (error) {
                console.log('[CommandManager.js] ' + error);
            }
        })();
    },

    /**
     * @function pushSlashCommands
     * @description Given a `CommandList.json` file, synchronizes all slash commands with those in the file.
     * ---
     * @param {path} JSONlistDir A path to the `CommandList.json` file
     * @param {globalConfigs.json} globalConfigs The `globalConfigs.json` file.
     * @param {boolean} globally Synchronize commands globally if true. Synchronizes commands in development servers otherwise.
     */
     pushSlashCommands: (JSONlistDir, globalConfigs, globally = false) => {

        let rawData = fs.readFileSync(path.resolve(path.join(JSONlistDir, 'CommandList.json')));
        let fileDataToPush = JSON.parse(rawData);

        const rest = new REST({ version: '9'}).setToken(process.env.DISCORD_CLIENT_TOKEN);

        (async () => {

            try {
                console.log('[CommandManager.js] Pushing slash commands to client...');

                await rest.put(
                    Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_PRIMARY_GUILD_ID),
                    { body: fileDataToPush },
                );

                console.log('[CommandManager.js] Successfully pushed slash commands!');
            } catch (error) {
                console.log('[CommandManager.js] ' + error);
            }
        })();

    },



    /**
     * @function initializeCommands
     * @description Creates a JSON string of a given directory filled with command files. Returns a string if found and null otherwise.
     * 
     * Optionally, it allows creation of a file, `CommandList.json`, with a given output directory with the JSON string. In this case it will return a string if given directory is valid
     * AND if the file was created successfully. It will return null otherwise.
     * 
     * ---
     * @param {path} commandsDir A path to a commands directory.
     * @param {boolean} updateFile  If true, updates `CommandList.json` at `fileDir`. Does not otherwise.
     * @param {path} [fileDir=null] OPTIONAL: a path for a `CommandsList.json file` to be outputted
     * 
     * @returns {string|null} A stringified JSON commands list OR null.
     */
    initalizeCommands: (commandsDir, updateFile, fileDir = null) => {

        let commandReqs = []; // An array of path requirements to each command.
        let commandData = []; // The JSON array that will be pushed to Discord API using requirements.

        // ===Scan directory!===
        fs.readdirSync(commandsDir).forEach(file => {

            //if "file" is a directory, then enter the directory and scan those files.
            if(fs.lstatSync(commandsDir).isDirectory()) {
                
                fs.readdirSync(path.join(commandsDir, file)).forEach(subfile => {

                    const subfileRequirement = require(path.resolve(path.join(commandsDir, file, subfile)));
                    commandReqs.push(subfileRequirement);
                    globalCommandCollection.set(subfile, subfileRequirement); //Set file: subfile.js, to requirement: subfieldRequirement
                });
            } else {

                // Put requirement into commandCollection collection.
                const fileRequirement = require(path.resolve(path.join(commandsDir, file)));
                commandReqs.push(fileRequirement);
                globalCommandCollection.set(file, fileRequirement); //Set file: file.js, to requirement: fileRequirement
            }
        });

        // Go through each requirement and push informational data to commandData.
        commandReqs.forEach(item => {
            commandData.push(item.data.toJSON());
        });

        // If updateFile is false, just return the commandsList as a json string.
        if(!updateFile) {
            return commandData;
        }

        // No matter what you update, writeFile will update the contents of this file accordingly.
        fs.writeFileSync(path.resolve(path.join(fileDir, 'CommandList.json')), JSON.stringify(commandData), function(err, file) {
            if (err) throw err;

            console.log("[CommandManager.js] CommandList.json was sucessfully updated!");
        });

        return commandData;
    }
}