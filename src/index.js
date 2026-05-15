const {
    Client, GatewayIntentBits, Collection, REST, Routes
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { config, TOKEN } = require('./modules/constants');
const { startApi } = require('./api');
const { checkExpiredPunishments } = require('./modules/moderationUtils');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();
client.cooldowns = new Collection();

// ============================================================
//  LOAD EVENTS
// ============================================================
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// ============================================================
//  LOAD COMMANDS
// ============================================================
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.warn(`[⚠️] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

// Events are loaded automatically from the events folder.

// ============================================================
//  START BOT
// ============================================================
const PORT = process.env.PORT || config.PORT || 3000;
startApi(PORT);

client.login(process.env.DISCORD_TOKEN || TOKEN).catch(err => {
    console.error('[❌] Login failed:', err);
});
