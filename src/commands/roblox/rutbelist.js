const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { rankList } = require('../../modules/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rutbelist')
        .setDescription('Tüm rütbe listesini gösterir.'),
    async execute(interaction, client) {
        const chunkSize = 14;
        const embeds = [];

        for (let i = 0; i < rankList.length; i += chunkSize) {
            const chunk = rankList.slice(i, i + chunkSize);
            const embed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle(i === 0 ? '📋 Tüm Rütbe Listesi' : '📋 Rütbe Listesi (devam)')
                .setDescription(chunk.map(r => `\`ID: ${String(r.id).padStart(2)}\` — **${r.name}**`).join('\n'))
                .setFooter({ text: `Sentura 🦸 ekoyildiz | ${rankList.length} rütbe` });
            embeds.push(embed);
        }

        await interaction.reply({ embeds: embeds.slice(0, 10) });
    },
};
