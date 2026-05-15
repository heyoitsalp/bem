const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ses-durdur')
        .setDescription('Botu ses kanalından çıkarır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction, client) {
        client.voiceManager.sesAktif = false;
        client.voiceManager.disconnect();

        const embed = new EmbedBuilder()
            .setColor('#FF4444')
            .setTitle('⏸️ Ses Sistemi Durduruldu')
            .setDescription('`/ses-baslat` komutuyla yeniden başlatabilirsin.')
            .addFields({ name: '👮 Yetkili', value: interaction.user.tag, inline: true })
            .setTimestamp()
            .setFooter({ text: 'Eko Yıldız | 7/24 Ses Sistemi' });

        await interaction.reply({ embeds: [embed] });
    },
};
