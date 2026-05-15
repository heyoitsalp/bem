const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ses-yenile')
        .setDescription('Botun ses kanalı bağlantısını yeniler.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction, client) {
        client.voiceManager.sesAktif = true;
        client.voiceManager.connect();

        const status = client.voiceManager.getStatus();

        const embed = new EmbedBuilder()
            .setColor('#00FF88')
            .setTitle('🔄 Ses Bağlantısı Yenilendi')
            .addFields(
                { name: '🎙️ Kanal',   value: `<#${status.SES_KANAL_ID}>`, inline: true },
                { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
            )
            .setTimestamp()
            .setFooter({ text: 'Eko Yıldız | 7/24 Ses Sistemi' });

        await interaction.reply({ embeds: [embed], flags: 64 });
    },
};
