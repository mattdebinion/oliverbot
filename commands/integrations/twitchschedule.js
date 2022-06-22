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

                }).catch( err => {
                    const invalidUserEmbed = new MessageEmbed()
                        .setColor('RED')
                        .setTitle('Twitch Stream Schedule Integration')
                        .setDescription('An associated broadcaster could not be found. Please try again.');

                    interaction.reply({embeds: [invalidUserEmbed], ephemeral: true});
                });
            });
        }

        if(interaction.options._subcommand === 'remove') {
            await interaction.reply('This command has not been implemented yet.');
        }

        if(interaction.options._subcommand === 'sync') {
            await interaction.reply('This command has not been implemented yet.');
        }
    }
}