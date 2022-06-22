const { SlashCommandBuilder } = require('@discordjs/builders');
const { Interaction, MessageEmbed, MessageButton, MessageActionRow } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('twitchschedule')
        .setDescription('Integrate a Twitch streamer\'s schedule to your Discord\'s events calendar.')
        .addSubcommand(subcommand => 
            subcommand
                .setName('add')
                .setDescription('Add a streamer\'s schedule.')
                .addStringOption(option => option.setName('name').setDescription('The streamer\'s name.')
                    .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a streamer\'s schedule.')
                .addStringOption(option => option.setName('name').setDescription('The streamer\'s name.')
                    .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sync')
                .setDescription('Sync all streamer\'s schedules manually.'))
        .setDefaultPermission(false),

    async run(interaction) {

        /**
         * HANLDE ADDING A SCHEDULE
         */
        if(interaction.options._subcommand === 'add') {

            // Call the Twitch API to get an access token.
            axios({
                method: 'post',
                url: 'https://id.twitch.tv/oauth2/token',
                data: {
                    'client_id': process.env.TWITCH_CLIENT_ID,
                    'client_secret': process.env.TWITCH_CLIENT_SECRET,
                    'grant_type': 'client_credentials'
                }
            }).then(ccRes => {

                let TWITCH_ACCESS_TOKEN = ccRes.data.access_token;

                // Call the Twitch API again to find the user's ID given a display name via the Interaction.
                axios({
                    method: 'get',
                    url: 'https://api.twitch.tv/helix/users?login=' + interaction.options._hoistedOptions[0].value,
                    headers: {
                        'Authorization': `Bearer ${TWITCH_ACCESS_TOKEN}`,
                        'Client-Id': process.env.TWITCH_CLIENT_ID
                    }
                }).then(userRes => {
                    
                    // Handle empty responses
                    let validateBroadcasterType = (userRes.data.data[0].broadcaster_type <= 0) ? 'none' : userRes.data.data[0].broadcaster_type;
                    let validateUserType = (userRes.data.data[0].type <= 0) ? 'none' : userRes.data.data[0].type;
                    let validateDescription = (userRes.data.data[0].description <= 0) ? 'no description provided' : userRes.data.data[0].description;
                    let msDate = Date.parse(userRes.data.data[0].created_at);
                    let validateCreationDate = new Date(msDate);

                    // Create the message embed
                    const foundUserEmbed = new MessageEmbed()
                        .setColor('YELLOW')
                        .setTitle('Twitch Stream Schedule Integration')
                        .setDescription('An associated broadcaster has been found. Please confirm broadcaster details before adding their schedule to your Discord server.')
                        .setThumbnail(userRes.data.data[0].profile_image_url)
                        .addFields(
                            {name: 'Display Name', value: userRes.data.data[0].display_name, inline: true},
                            // {name: 'View Count', value: userRes.data.data[0].view_count, inline: true},
                            {name: 'Broadcaster Type', value: validateBroadcasterType, inline: true},
                            {name: 'User Type', value: validateUserType, inline: true},
                            {name: 'Channel Description', value: validateDescription, inline: false},
                            {name: 'Created On', value: validateCreationDate.toDateString(), inline: false},
                        )
                        .setTimestamp();

                    const row = new MessageActionRow()
                        .addComponents(
                            new MessageButton()
                                .setCustomId('confirm')
                                .setLabel('Looks good!')
                                .setStyle('SUCCESS'),
                            new MessageButton()
                                .setCustomId('cancel')
                                .setLabel('There\'s something wrong!')
                                .setStyle('DANGER'),
                            new MessageButton()
                                .setLabel('Visit Channel')
                                .setURL('https://www.twitch.tv/' + userRes.data.data[0].login)
                                .setStyle('LINK'),
                        );

                    // Respond with the found user
                    interaction.reply({embeds: [foundUserEmbed], components: [row], ephemeral: true});

                    // Create a collector that listens if one of the buttons are pressed.
                    const awaitResponse = interaction.channel.createMessageComponentCollector();
                    awaitResponse.on('collect', async i => {

                        if(i.customId === 'confirm') {
                            const workingEmbed = new MessageEmbed()
                                .setColor('YELLOW')
                                .setTitle('Twitch Stream Schedule Integration')
                                .setDescription('Adding schedule to your calendar, please wait!')
                                .setFields(
                                    {name: 'Events Found', value: '0', inline: true},
                                )
                                .setTimestamp();

                            interaction.editReply({embeds: [workingEmbed], components: [], ephemeral: true});
                            awaitResponse.stop();
                            
                            // Call the Twitch API to get the streamer's schedule.
                            axios({
                                method: 'get',
                                url: 'https://api.twitch.tv/helix/schedule?broadcaster_id=' + userRes.data.data[0].id,
                                headers: {
                                    'Authorization': `Bearer ${TWITCH_ACCESS_TOKEN}`,
                                    'Client-Id': process.env.TWITCH_CLIENT_ID
                                }
                            }).then(schedRes => {
                                
                                // The progress embed.
                                let amtSegments = 0;
                                let progressEmbed = new MessageEmbed()
                                .setColor('YELLOW')
                                .setTitle('Twitch Stream Schedule Integration')
                                .setDescription('Adding schedule to your calendar, please wait! Do not close this embed!')
                                .setFields(
                                    {name: 'Segments Found', value: 'Calculating...', inline: true},
                                )
                                .setTimestamp();

                                // Iterate through all segments retrieving their title, category, description, start time, and end time.
                                let allSegments = schedRes.data.data.segments;
                                for(let seg = 0; seg < 5; seg++) {

                                    // For each segment, create a new event using GuildScheduledEventManager
                                    let checkCategory = allSegments[seg].category;
                                    let parseStartTime = Date.parse(allSegments[seg].start_time);
                                    let parseEndTime = (allSegments[seg].end_time === null ? Date.parse(allSegments[seg].start_time) + 7200000 : Date.parse(allSegments[seg].end_time));

                                    let eventDetails = {
                                        name: allSegments[seg].title,
                                        privacyLevel: 'GUILD_ONLY',
                                        entityType: 'EXTERNAL',
                                        entityMetadata: {location: 'https://www.twitch.tv/' + userRes.data.data[0].login}, // Identifier for removing events.
                                        scheduledStartTime: parseStartTime,
                                        scheduledEndTime: parseEndTime,
                                        description: (checkCategory === null ? 'none' : allSegments[seg].category.name),
                                        reason: 'Oliverbot Twitch Stream Schedule Integration',
                                    }

                                    // @TODO: find a way to prevent duplicate entries
                                    interaction.guild.scheduledEvents.create(eventDetails);
                                    amtSegments++;
                                }

                                // Create the final embed to confirm the schedule was added.
                                const finalEmbed = new MessageEmbed()
                                    .setColor('GREEN')
                                    .setTitle('Twitch Stream Schedule Integration')
                                    .setDescription('All segments have been successfully pulled and added into the Events Calendar. You may close this embed.')
                                    .setFields(
                                        {name: 'Total Events Added', value: amtSegments.toString(), inline: true},
                                    )
                                    .setTimestamp();

                                interaction.editReply({embeds: [finalEmbed], components: [], ephemeral: true});
                                return;
                            });
                        }

                        if(i.customId === 'cancel') {
                            const incorrectEmbed = new MessageEmbed()
                                .setColor('RED')
                                .setTitle('Twitch Stream Schedule Integration')
                                .setDescription('Schedule integration aborted. Run the command again and ensure broadcaster name exists and is spelled correctly.')
                                .setTimestamp();

                            interaction.editReply({embeds: [incorrectEmbed], components: [], ephemeral: true});
                            return;
                        }
                    });

                }).catch( err => {
                    const invalidUserEmbed = new MessageEmbed()
                        .setColor('RED')
                        .setTitle('Twitch Stream Schedule Integration')
                        .setDescription('An associated broadcaster could not be found. Please try again.');

                    interaction.reply({embeds: [invalidUserEmbed], ephemeral: true});
                });
            });

        /**
         * HANDLE REMOVING A SCHEDULE
         */
        } else if(interaction.options._subcommand === 'remove') {
            
            let broadcaster = interaction.options._hoistedOptions[0].value;

            // Create the message embed
            const foundUserEmbed = new MessageEmbed()
            .setColor('YELLOW')
            .setTitle('Twitch Stream Schedule Integration')
            .setDescription('Please confirm you wish to remove ' + broadcaster + '\'s schedule from the Events Calendar.')
            .setTimestamp();

            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('confirm')
                        .setLabel('Remove them!')
                        .setStyle('DANGER'),
                    new MessageButton()
                        .setCustomId('cancel')
                        .setLabel('There\'s something wrong.')
                        .setStyle('PRIMARY'),
                    new MessageButton()
                        .setLabel('Visit Channel')
                        .setURL('https://www.twitch.tv/' + broadcaster)
                        .setStyle('LINK'),
            );

            // Respond with the found user
            interaction.reply({embeds: [foundUserEmbed], components: [row], ephemeral: true});

            // Create a collector that listens if one of the buttons are pressed.
            const awaitResponse = interaction.channel.createMessageComponentCollector();
            awaitResponse.on('collect', async i => {

                if(i.customId === 'confirm') {
                    const workingEmbed = new MessageEmbed()
                        .setColor('YELLOW')
                        .setTitle('Twitch Stream Schedule Integration')
                        .setDescription('Removing associated guild events, please wait. Do not close this embed!')
                        .setTimestamp();

                    interaction.editReply({embeds: [workingEmbed], components: [], ephemeral: true});
                    awaitResponse.stop();

                    // Get the guild's scheduled events and delete ones matching user input in URL form.
                    let eventParameters = {
                        url: 'https://www.twitch.tv/' + broadcaster
                    };

                    interaction.guild.scheduledEvents.fetch(eventParameters)
                    .then(events => {
                        events.forEach(event => {
                            event.delete();
                        });
                    }).finally(() => {
                        const finalEmbed = new MessageEmbed()
                                .setColor('GREEN')
                                .setTitle('Twitch Stream Schedule Integration')
                                .setDescription('All events associated with ' + broadcaster + ' have been successfully removed from the Events Calendar. You may close this embed.')
                                .setTimestamp();

                        interaction.editReply({embeds: [finalEmbed], components: [], ephemeral: true});
                        return;
                    });
                }
            });
        }

        if(interaction.options._subcommand === 'sync') {
            await interaction.reply('This command has not been implemented yet.');
        }
    }
}