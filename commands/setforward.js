const { SlashCommandBuilder } = require('@discordjs/builders');
const { loadMappings, saveMappings } = require('../mappings'); // Adjust path to mappings.js

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setforward')
    .setDescription('Set up channel forwarding')
    .addChannelOption(option => option.setName('source').setDescription('Source channel').setRequired(true))
    .addChannelOption(option => option.setName('target').setDescription('Target channel').setRequired(true))
    .addStringOption(option => option.setName('server').setDescription('Optional server ID')),

  async execute(interaction) {
    const sourceChannel = interaction.options.getChannel('source');
    const targetChannel = interaction.options.getChannel('target');
    const serverId = interaction.options.getString('server'); // Optional server ID

    // Ensure both channels are text channels
    if (sourceChannel.type !== 'GUILD_TEXT' || targetChannel.type !== 'GUILD_TEXT') {
      return interaction.reply('Both channels must be text channels!');
    }

    // Load existing mappings
    const channelMappings = loadMappings();

    // Default server to the current guild if not provided
    const guildId = serverId || interaction.guild.id;

    // Store the source-target mapping for the current guild (or provided server)
    if (!channelMappings[guildId]) {
      channelMappings[guildId] = [];
    }

    channelMappings[guildId].push({
      source: sourceChannel.id,
      target: targetChannel.id,
    });

    // Save updated mappings to the JSON file
    saveMappings(channelMappings);

    await interaction.reply(`Messages from ${sourceChannel.name} will be forwarded to ${targetChannel.name} in the server ${guildId}.`);
    console.log(`Source and target channels for guild ${guildId}:`, channelMappings[guildId]);
  },
};
