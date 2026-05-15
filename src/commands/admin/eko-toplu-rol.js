const { SlashCommandBuilder } = require('discord.js');
const { EKO_GUILD_ID, EKO_KANAL_ID, EKO_ROL_ID, ekoFotografVarMi } = require('../../modules/ekoUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eko-toplu-rol')
        .setDescription('Kanalda fotoğraf paylaşmış herkese Eko Yıldız rolü verir (toplu).'),
    async execute(interaction, client) {
        if (interaction.guildId !== EKO_GUILD_ID) return interaction.reply({ content: '❌ Bu komut sadece Eko sunucusunda kullanılabilir.', flags: 64 });

        await interaction.deferReply({ flags: 64 });

        const guild = client.guilds.cache.get(EKO_GUILD_ID);
        if (!guild) return interaction.editReply('❌ Sunucu bulunamadı.');

        const rol = guild.roles.cache.get(EKO_ROL_ID);
        if (!rol) return interaction.editReply('❌ Eko Yıldız rolü bulunamadı.');

        const kanal = guild.channels.cache.get(EKO_KANAL_ID);
        if (!kanal) return interaction.editReply('❌ Eko kanalı bulunamadı.');

        let mesajlar;
        try {
            mesajlar = await kanal.messages.fetch({ limit: 100 });
        } catch {
            return interaction.editReply('❌ Mesajlar alınamadı.');
        }

        const fotografPaylasanlar = new Set();
        mesajlar.forEach(m => {
            if (!m.author.bot && ekoFotografVarMi(m)) {
                fotografPaylasanlar.add(m.author.id);
            }
        });

        await guild.members.fetch();
        let verildi = 0, atildi = 0, hata = 0;

        for (const userId of fotografPaylasanlar) {
            const m = guild.members.cache.get(userId);
            if (!m) { hata++; continue; }

            if (!m.roles.cache.has(EKO_ROL_ID)) {
                try {
                    await m.roles.add(rol, 'Toplu rol verme işlemi');
                    verildi++;
                } catch {
                    hata++;
                }
            } else {
                atildi++;
            }
            // Rate limit
            await new Promise(r => setTimeout(r, 100));
        }

        await interaction.editReply(
            `📊 Toplu işlem tamamlandı:\n✅ Rol Verildi: **${verildi}**\n⏩ Zaten Vardı: **${atildi}**\n❌ Hata: **${hata}**`
        );
    },
};
