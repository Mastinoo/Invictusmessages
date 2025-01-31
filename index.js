require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');

// Load mappings from the mappings.json file
const MAPPINGS_FILE_PATH = process.env.MAPPINGS_FILE_PATH;
let channelMappings = loadMappings();

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Optional, depending on your needs
  ],
});

// When the bot is ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  require('./register-commands'); // Register slash commands when the bot is ready
});

// Listen for interactions (slash commands)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'setforward') {
    const sourceChannel = interaction.options.getChannel('source');
    const targetChannel = interaction.options.getChannel('target');
    const serverId = interaction.options.getString('server'); // Optional server ID

    // Ensure both channels are text channels
    if (sourceChannel.type !== 'GUILD_TEXT' || targetChannel.type !== 'GUILD_TEXT') {
      return interaction.reply('Both channels must be text channels!');
    }

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
  }
});

// Listen for new messages and forward them to the target channel
client.on('messageCreate', async (message) => {
  if (message.author.bot) return; // Avoid forwarding bot messages

  const guildId = message.guild.id;
  if (channelMappings[guildId]) {
    for (let mapping of channelMappings[guildId]) {
      if (message.channel.id === mapping.source) {
        const targetChannel = await message.guild.channels.fetch(mapping.target);
        if (targetChannel) {
          targetChannel.send(`Forwarded message: ${message.content}`);
        }
      }
    }
  }

  // Forward between different guilds (cross-server forwarding)
  for (let mappedGuildId in channelMappings) {
    if (mappedGuildId === guildId) continue;

    for (let mapping of channelMappings[mappedGuildId]) {
      if (message.channel.id === mapping.source) {
        const targetGuild = client.guilds.cache.get(mappedGuildId);
        if (targetGuild) {
          const targetChannel = await targetGuild.channels.fetch(mapping.target);
          if (targetChannel) {
            targetChannel.send(`Forwarded message: ${message.content}`);
          }
        }
      }
    }
  }
});

// Login the bot with the token from .env
client.login(process.env.DISCORD_TOKEN);

// Helper function to load mappings from file
function loadMappings() {
  try {
    const data = fs.readFileSync(MAPPINGS_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return {}; // Return an empty object if the file doesn't exist yet
  }
}

// Helper function to save mappings to file
function saveMappings(mappings) {
  fs.writeFileSync(MAPPINGS_FILE_PATH, JSON.stringify(mappings, null, 2), 'utf8');
}
