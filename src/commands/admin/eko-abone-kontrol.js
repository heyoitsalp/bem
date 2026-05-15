const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ekoAbonerDatabase, EKO_GUILD_ID, EKO_ROL_ID } = require('../../modules/ekoUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eko-abone-kontrol')
        .setDescription('Bir kullanıcının abone durumunu kontrol eder.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Kontrol edilecek kişi').setRequired(true)),
    async execute(interaction, client) {
        if (interaction.guildId !== EKO_GUILD_ID) return interaction.reply({ content: '❌ Bu komut sadece Eko sunucusunda kullanılabilir.', flags: 64 });

        const hedef = interaction.options.getUser('kullanici');
        const veri = ekoAbonerDatabase.get(hedef.id);
        const guild = client.guilds.cache.get(EKO_GUILD_ID);
        let abone = false;

        if (guild) {
            const m = await guild.members.fetch(hedef.id).catch(() => null);
            if (m) abone = m.roles.cache.has(EKO_ROL_ID);
        }

        const embed = new EmbedBuilder()
            .setColor(abone ? '#FFD700' : '#888888')
            .setTitle(`⭐ Abone Kontrol — ${hedef.tag}`)
            .setThumbnail(hedef.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🎭 Abone Rolü', value: abone ? '✅ Mevcut' : '❌ Yok', inline: true },
                { name: '📸 Paylaştığı Fotoğraf', value: veri ? String(veri.totalPhotos) : '0', inline: true },
                { name: '📅 Son Paylaşım', value: veri?.lastPhotoAt ? `<t:${Math.floor(new Date(veri.lastPhotoAt).getTime() / 1000)}:R>` : 'Bilinmiyor', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Eko Yıldız Otomasyon' });

        await interaction.reply({ embeds: [embed], flags: 64 });
    },
};
