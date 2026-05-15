const { SlashCommandBuilder } = require('discord.js');
const { status } = require('../../api');
const { buildModEmbed, sendLog } = require('../../modules/embedBuilders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('oyun-yonet')
        .setDescription('Oyunu açar veya kapatır.')
        .addBooleanOption(opt => opt.setName('durum').setDescription('Açık mı?').setRequired(true)),
    async execute(interaction, client) {
        const durum = interaction.options.getBoolean('durum');
        status.isGameOpen = durum;
        const embed = buildModEmbed(
            durum ? '🟢 Oyun Açıldı' : '🔴 Oyun Kapatıldı',
            durum ? '#00FF00' : '#FF0000',
            [
                { name: '🎮 Sistem', value: 'Oyun', inline: true },
                { name: '📊 Durum', value: durum ? '**AÇIK**' : '**KAPALI**', inline: true },
                { name: '👮 İşlemi Yapan', value: interaction.user.tag, inline: true }
            ]
        );
        await interaction.reply({ embeds: [embed] });
        await sendLog(client, embed);
    },
};
