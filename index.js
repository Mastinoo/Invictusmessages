require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Load mappings from the mappings.json file
const MAPPINGS_FILE_PATH = process.env.MAPPINGS_FILE_PATH;
let channelMappings = loadMappings();

// Dynamically load all commands from the "commands" directory
const commands = [];
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
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
      Routes.applicationCommands(process.env.CLIENT_ID),
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
  const command = commands.find(cmd => cmd.data.name === commandName);
  if (command) {
    try {
      await command.execute(interaction);
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
