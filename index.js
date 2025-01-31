require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Store the forward configurations (guildID -> { sourceChannelId: targetGuildId -> targetChannelId })
let forwardConfig = {}; // { guildId: { sourceChannelId: { targetGuildId: targetChannelId } } }

// Command to set the source and target channels across servers
client.on('messageCreate', async (message) => {
    // Ignore bot messages and messages from a different bot
    if (message.author.bot) return;

    // Command to set source and target channels
    if (message.content.startsWith('!setforward')) {
        const args = message.content.split(' ');

        // Ensure the correct format of the command
        if (args.length === 5) {
            const sourceGuildId = args[1];
            const sourceChannelId = args[2].replace(/[<#>]/g, ''); // Remove any channel ID format symbols
            const targetGuildId = args[3];
            const targetChannelId = args[4].replace(/[<#>]/g, '');

            // Check if both source and target channels exist in their respective guilds
            const sourceGuild = client.guilds.cache.get(sourceGuildId);
            const targetGuild = client.guilds.cache.get(targetGuildId);

            if (sourceGuild && targetGuild) {
                // Check if both channels exist in their respective guilds
                const sourceChannel = sourceGuild.channels.cache.get(sourceChannelId);
                const targetChannel = targetGuild.channels.cache.get(targetChannelId);

                if (sourceChannel && targetChannel) {
                    // Set the forward configuration
                    if (!forwardConfig[sourceGuildId]) forwardConfig[sourceGuildId] = {};
                    forwardConfig[sourceGuildId][sourceChannelId] = {
                        targetGuildId,
                        targetChannelId
                    };
                    message.reply(`Successfully set up forwarding from <#${sourceChannelId}> in server ${sourceGuild.name} to <#${targetChannelId}> in server ${targetGuild.name}.`);
                } else {
                    message.reply('Invalid source or target channel ID.');
                }
            } else {
                message.reply('Invalid source or target guild ID.');
            }
        } else {
            message.reply('Please use the format: !setforward <source_guild_id> <source_channel> <target_guild_id> <target_channel>');
        }
    }

    // Command to remove forwarding
    if (message.content.startsWith('!removeforward')) {
        const args = message.content.split(' ');

        if (args.length === 3) {
            const sourceGuildId = args[1];
            const sourceChannelId = args[2].replace(/[<#>]/g, '');

            // Remove the forward configuration
            if (forwardConfig[sourceGuildId] && forwardConfig[sourceGuildId][sourceChannelId]) {
                delete forwardConfig[sourceGuildId][sourceChannelId];
                message.reply(`Removed forwarding from <#${sourceChannelId}> in server ${sourceGuildId}.`);
            } else {
                message.reply('No forwarding found for this channel.');
            }
        } else {
            message.reply('Please use the format: !removeforward <source_guild_id> <source_channel>');
        }
    }

    // Listen for messages in source channels and forward them
    const sourceGuildId = message.guild.id;
    const sourceChannelId = message.channel.id;

    if (forwardConfig[sourceGuildId] && forwardConfig[sourceGuildId][sourceChannelId]) {
        const { targetGuildId, targetChannelId } = forwardConfig[sourceGuildId][sourceChannelId];
        
        const targetGuild = client.guilds.cache.get(targetGuildId);
        if (targetGuild) {
            const targetChannel = targetGuild.channels.cache.get(targetChannelId);
            if (targetChannel) {
                // Forward the message content
                targetChannel.send(`Forwarded from <#${sourceChannelId}> in ${message.guild.name}: ${message.content}`);
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN); // Replace with your bot's token
