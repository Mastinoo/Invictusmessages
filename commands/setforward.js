const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setforward')
    .setDescription('Sets up message forwarding between channels.')
    .addChannelOption(option =>
      option.setName('source')
        .setDescription('Source channel for message forwarding')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('target')
        .setDescription('Target channel for message forwarding')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('server')
        .setDescription('Server ID to forward messages to (optional)')),
};
