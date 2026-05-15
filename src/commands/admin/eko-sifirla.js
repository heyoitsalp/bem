const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ekoAbonerDatabase, ekoCooldownSet, EKO_GUILD_ID } = require('../../modules/ekoUtils');
const { sendLog } = require('../../modules/embedBuilders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eko-sifirla')
        .setDescription('Bir kullanıcının Eko Yıldız abone verilerini sıfırlar.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Sıfırlanacak kişi').setRequired(true)),
    async execute(interaction, client) {
        if (interaction.guildId !== EKO_GUILD_ID) return interaction.reply({ content: '❌ Bu komut sadece Eko sunucusunda kullanılabilir.', flags: 64 });

        const hedef = interaction.options.getUser('kullanici');
        const onceki = ekoAbonerDatabase.get(hedef.id);

        if (!onceki) {
            return interaction.reply({ content: `❌ **${hedef.tag}** için Eko Yıldız verisi bulunamadı.`, flags: 64 });
        }

        ekoAbonerDatabase.delete(hedef.id);

        // Cooldown'u da temizle
        for (const key of ekoCooldownSet) {
            if (key.startsWith(hedef.id)) ekoCooldownSet.delete(key);
        }

        const embed = new EmbedBuilder()
            .setColor('#FF4444')
            .setTitle('🗑️ Eko Yıldız Verisi Sıfırlandı')
            .addFields(
                { name: '👤 Kullanıcı', value: `${hedef.tag} (${hedef.id})`, inline: true },
                { name: '📸 Önceki Fotoğraf Sayısı', value: String(onceki.totalPhotos || 0), inline: true },
                { name: '👮 İşlemi Yapan', value: interaction.user.tag, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Eko Yıldız Otomasyon' });

        await interaction.reply({ embeds: [embed] });
        await sendLog(client, embed);
    },
};
