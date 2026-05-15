const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { status } = require('../../api');
const { buildModEmbed, sendLog } = require('../../modules/embedBuilders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tumunu-ac')
        .setDescription('Oyun, Market ve Adalet Sarayını aynı anda açar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {
        status.isGameOpen = true;
        status.isMarketOpen = true;
        status.isAdaletSarayOpen = true;

        const embed = buildModEmbed(
            '✅ Tüm Sistemler Açıldı',
            '#00FF00',
            [
                { name: '🎮 Oyun', value: '✅ AÇIK', inline: true },
                { name: '🛒 Market', value: '✅ AÇIK', inline: true },
                { name: '⚖️ Adalet Sarayı', value: '✅ AÇIK', inline: true },
                { name: '👮 İşlemi Yapan', value: interaction.user.tag, inline: false }
            ]
        );

        await interaction.reply({ embeds: [embed] });
        await sendLog(client, embed);
    },
};
