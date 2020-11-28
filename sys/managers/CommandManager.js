/* ========================================================================================================================
 * CommandManager.js
 * =================
 * Provides synchronization of user defined commands and groups when folders and valid .js files are placed in ../commands.
 * 
 * Every folder placed in the commands folder will be defined as a group while all valid .js files that are placed inside these
 * folders will be defined as a command within these groups by default.
 * 
 * See the README to learn how to create valid command files that will be detected by CommandManager.
 * ======================================================================================================================== */
const { CommandoClient } = require('discord.js-commando');

const path = require('path');
const fs = require('fs');

module.exports = {

    /**
     * The test function for CommandManager.

     */
    test: function () {

        console.log("Detected!");

    },

    /**
     * Register all groups and commands within the command folder. The command directory is relative to this manager.
     * @param {CommandoClient} Client A valid discord.js-commando client
     * @param {path} directory A valid path
     */
    register: function (Client, directory) {

        var scannedGroups = fs.readdirSync(directory, { withFileTypes: true });
        var foundGroups = [];

        scannedGroups.forEach(file => {

            if (fs.existsSync(path.join(directory, `${file.name}/${file.name}.json`))) {

                let rawdata = fs.readFileSync(path.join(directory, `${file.name}/${file.name}.json`));
                let descriptor = JSON.parse(rawdata);

                console.log(`[CommandManager.js] ${file.name} has a custom defined description name: ${descriptor.description}`);
                foundGroups.push([file.name, descriptor.description]);

            } else {

                console.log(`[CommandManager.js] No description file can be found for ${file.name}. Using the default description instead.`);
                foundGroups.push([file.name, file.name]);

            }

        });

        // Registers everything with the client.
        Client.registry
            .registerDefaultTypes()
            .registerGroups(foundGroups)
            .registerDefaultGroups()
            .registerDefaultCommands()
            .registerCommandsIn(directory);

    }
};

