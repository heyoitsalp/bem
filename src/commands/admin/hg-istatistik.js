const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { hgIstatistik, hgGunlukSifirla } = require('../../modules/stats');
const { YOUTUBE_ABONE_LINK, YOUTUBE_UYE_LINK } = require('../../modules/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hg-istatistik')
        .setDescription('Hoşgeldin sisteminin istatistiklerini gösterir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction, client) {
        hgGunlukSifirla();

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('👋 Hoşgeldin Sistemi — İstatistikler')
            .addFields(
                { name: '👥 Toplam Katılan (Bu Oturum)', value: String(hgIstatistik.toplamKatilan), inline: true },
                { name: '📅 Bugün Katılan', value: String(hgIstatistik.bugunKatilan), inline: true },
                { name: '🏰 Mevcut Üye Sayısı', value: String(interaction.guild.memberCount), inline: true },
                { name: '📺 YouTube Abone Linki', value: `[Abone Ol!](${YOUTUBE_ABONE_LINK})`, inline: true },
                { name: '💎 YouTube Üyelik Linki', value: `[Üye Ol!](${YOUTUBE_UYE_LINK})`, inline: true },
            )
            .setTimestamp()
            .setFooter({ text: 'Eko Yıldız Hoşgeldin Sistemi' });

        await interaction.reply({ embeds: [embed], flags: 64 });
    },
};
