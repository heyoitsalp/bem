const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ses-baslat')
        .setDescription('Botu ses kanalına yeniden bağlar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction, client) {
        client.voiceManager.sesAktif = true;
        client.voiceManager.sesDenemeSayisi = 0;
        client.voiceManager.connect();

        const status = client.voiceManager.getStatus();

        const embed = new EmbedBuilder()
            .setColor('#00FF88')
            .setTitle('▶️ Ses Sistemi Başlatıldı')
            .addFields(
                { name: '🎙️ Kanal',   value: `<#${status.SES_KANAL_ID}>`, inline: true },
                { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
            )
            .setTimestamp()
            .setFooter({ text: 'Eko Yıldız | 7/24 Ses Sistemi' });

        await interaction.reply({ embeds: [embed], flags: 64 });
    },
};
