require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { loadMappings, saveMappings } = require('./mappings'); // Import loadMappings and saveMappings from mappings.js

// Initialize the client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Load mappings from the mappings.json file
const MAPPINGS_FILE_PATH = process.env.MAPPINGS_FILE_PATH;
let channelMappings = loadMappings(); // Load mappings at the start

// Dynamically load all commands from the "commands" directory
const commands = [];
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

// Load command data and add to the commands array
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (command.data) {
    commands.push(command.data.toJSON());  // Ensure only command data is pushed
  } else {
    console.warn(`Warning: Command file ${file} is missing "data" property!`);
  }
}


// Register commands when the bot is ready
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const { REST } = require('@discordjs/rest');
  const { Routes } = require('discord-api-types/v9');

  const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('Started refreshing application (/) commands.');
    
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID), // Register globally or use Routes.applicationGuildCommands() for a single guild
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error while registering commands:', error);
  }
});

// Listen for interactions (slash commands)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  // Find and execute the correct command
  const command = commands.find(cmd => cmd.name === commandName);
  if (command) {
    try {
      await command.execute(interaction);  // Make sure command has execute() method defined in its file
    } catch (error) {
      console.error('Error executing command:', error);
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
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

// Dummy server to bind to a port (for Render)
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running');
});

server.listen(process.env.PORT || 3000, () => {
  console.log('Bot is running on port 3000');
});
