const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ekoDailyStats, ekoAbonerDatabase, ekoCooldownSet, EKO_GUILD_ID, EKO_ROL_ID } = require('../../modules/ekoUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eko-istatistik')
        .setDescription('Eko Yıldız abone istatistiklerini gösterir.'),
    async execute(interaction, client) {
        if (interaction.guildId !== EKO_GUILD_ID) return interaction.reply({ content: '❌ Bu komut sadece Eko sunucusunda kullanılabilir.', flags: 64 });

        const bugun = new Date().toISOString().slice(0, 10);
        const gunlukFoto = ekoDailyStats.get(bugun) || 0;
        const toplamAbone = ekoAbonerDatabase.size;
        const toplamFoto = [...ekoAbonerDatabase.values()].reduce((t, u) => t + (u.totalPhotos || 0), 0);

        let rolUyeSayisi = 0;
        try {
            const guild = client.guilds.cache.get(EKO_GUILD_ID);
            if (guild) {
                await guild.members.fetch();
                rolUyeSayisi = guild.members.cache.filter(m => m.roles.cache.has(EKO_ROL_ID)).size;
            }
        } catch {}

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('⭐ Eko Yıldız — İstatistikler')
            .addFields(
                { name: '👥 Toplam Abone (Rol)', value: String(rolUyeSayisi), inline: true },
                { name: '📊 Takip Edilen Kullanıcı', value: String(toplamAbone), inline: true },
                { name: '📸 Toplam Fotoğraf', value: String(toplamFoto), inline: true },
                { name: '📅 Bugünkü Fotoğraf', value: String(gunlukFoto), inline: true },
                { name: '🕐 Cooldown\'daki Kişi', value: String(ekoCooldownSet.size), inline: true },
                { name: '📆 Tarih', value: bugun, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Eko Yıldız Otomasyon' });

        await interaction.reply({ embeds: [embed] });
    },
};
