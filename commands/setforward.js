const { SlashCommandBuilder } = require('@discordjs/builders');
const { loadMappings, saveMappings } = require('../mappings'); // Adjust path to mappings.js
const { ChannelType } = require('discord.js'); // Import ChannelType for more accurate type checking

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setforward')
    .setDescription('Set up channel forwarding')
    .addChannelOption(option => 
      option.setName('source')
            .setDescription('Source channel')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.GuildForum) // Allow all relevant types
    )
    .addChannelOption(option => 
      option.setName('target')
            .setDescription('Target channel')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.GuildForum) // Allow all relevant types
    )
    .addStringOption(option => 
      option.setName('server')
            .setDescription('Optional server ID')
    ),

  async execute(interaction) {
    const sourceChannel = interaction.options.getChannel('source');
    const targetChannel = interaction.options.getChannel('target');
    const serverId = interaction.options.getString('server'); // Optional server ID

    // Ensure both channels are valid and of correct types
    if (![ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.GuildForum].includes(sourceChannel.type) || 
        ![ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.GuildForum].includes(targetChannel.type)) {
      return interaction.reply('Both source and target must be text channels, threads, or forum channels!');
    }

    // Load existing mappings
    let channelMappings = loadMappings();

    // Default server to the current guild if not provided
    const guildId = serverId || interaction.guild.id;

    // Initialize mappings for the guild if not already set
    if (!channelMappings[guildId]) {
      channelMappings[guildId] = [];
    }

    // Store the new mapping
    channelMappings[guildId].push({
      source: sourceChannel.id,
      target: targetChannel.id,
    });

    // Save the updated mappings
    saveMappings(channelMappings);

    // Acknowledge the setup
    await interaction.reply(`Messages from ${sourceChannel.name} will now be forwarded to ${targetChannel.name} in the server ${guildId}.`);
    console.log(`Source and target channels for guild ${guildId}:`, channelMappings[guildId]);
  },
};
