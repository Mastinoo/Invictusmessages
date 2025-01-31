require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Initialize the client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Define path to mappings file
const MAPPINGS_FILE_PATH = process.env.MAPPINGS_FILE_PATH;

// ✅ Add this function before calling loadMappings()
function loadMappings() {
  if (!fs.existsSync(MAPPINGS_FILE_PATH)) {
    return {}; // Return empty object if file does not exist
  }

  try {
    const data = fs.readFileSync(MAPPINGS_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error loading mappings:', error);
    return {};
  }
}

// Load mappings
let channelMappings = loadMappings();


// **1️⃣ Load all commands properly and store them in a Map**
const commands = new Map();
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (command.data && typeof command.execute === 'function') {
    commands.set(command.data.name, command); // Store full command object
  } else {
    console.warn(`⚠️ Warning: Command file "${file}" is missing "data" or "execute"!`);
  }
}

// **2️⃣ Register commands when the bot is ready**
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const { REST } = require('@discordjs/rest');
  const { Routes } = require('discord-api-types/v9');
  const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('🚀 Started refreshing application (/) commands.');

    // Only send .data.toJSON() when registering
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID), 
      { body: [...commands.values()].map(cmd => cmd.data.toJSON()) }
    );

    console.log('✅ Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('❌ Error while registering commands:', error);
  }
});

// **3️⃣ Listen for interactions (slash commands)**
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = commands.get(interaction.commandName); // Retrieve command from Map

  if (!command) {
    console.error(`❌ Command "${interaction.commandName}" not found.`);
    return;
  }

  try {
    await command.execute(interaction);  // Execute the command
  } catch (error) {
    console.error('❌ Error executing command:', error);
    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
  }
});

// **4️⃣ Listen for new messages and forward them**
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

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

  // Cross-server forwarding
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

// **5️⃣ Login the bot**
client.login(process.env.DISCORD_TOKEN);

// **6️⃣ Dummy server to prevent Render from killing the bot**
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running');
});
server.listen(process.env.PORT || 3000, () => {
  console.log('🌐 Bot is running on port 3000');
});
