const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Botun gecikme süresini gösterir.'),
    async execute(interaction, client) {
        await interaction.reply(`🏓 Pong! Gecikme: **${client.ws.ping}ms**`);
    },
};
