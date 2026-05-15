const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { status } = require('../../api');
const { buildModEmbed, sendLog } = require('../../modules/embedBuilders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tumunu-kapat')
        .setDescription('Tüm sistemleri aynı anda kapatır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {
        status.isGameOpen = false;
        status.isMarketOpen = false;
        status.isAdaletSarayOpen = false;

        const embed = buildModEmbed(
            '🚨 Tüm Sistemler Kapatıldı',
            '#FF0000',
            [
                { name: '🎮 Oyun', value: '❌ KAPALI', inline: true },
                { name: '🛒 Market', value: '❌ KAPALI', inline: true },
                { name: '⚖️ Adalet Sarayı', value: '❌ KAPALI', inline: true },
                { name: '👮 İşlemi Yapan', value: interaction.user.tag, inline: false }
            ]
        );

        await interaction.reply({ embeds: [embed] });
        await sendLog(client, embed);
    },
};
