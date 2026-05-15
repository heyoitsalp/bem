const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { status } = require('../../api');
const { buildModEmbed, sendLog } = require('../../modules/embedBuilders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('market-yonet')
        .setDescription('Rütbe marketini açar veya kapatır.')
        .addBooleanOption(opt => opt.setName('durum').setDescription('Açık mı?').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction, client) {
        const durum = interaction.options.getBoolean('durum');
        status.isMarketOpen = durum;

        const embed = buildModEmbed(
            durum ? '🟢 Market Açıldı' : '🔴 Market Kapatıldı',
            durum ? '#00FF00' : '#FF0000',
            [
                { name: '🛒 Sistem', value: 'Rütbe Marketi', inline: true },
                { name: '📊 Durum', value: durum ? '**AÇIK**' : '**KAPALI**', inline: true },
                { name: '👮 İşlemi Yapan', value: interaction.user.tag, inline: true }
            ]
        );

        await interaction.reply({ embeds: [embed] });
        await sendLog(client, embed);
    },
};
