const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ses-durum')
        .setDescription('Botun ses kanalı bağlantı durumunu gösterir.'),
    async execute(interaction, client) {
        const status = client.voiceManager.getStatus();
        const { sesAktif, sesBagliMi, sesBaglanmaZaman, sesDenemeSayisi, SES_KANAL_ID, SES_GUILD_ID } = status;
        
        const guild = client.guilds.cache.get(SES_GUILD_ID);
        const botVoiceState = guild?.voiceStates.cache.get(client.user.id);
        const gercektenBagli = botVoiceState?.channelId === SES_KANAL_ID;

        let uptimeStr = 'Bilinmiyor';
        if (sesBaglanmaZaman && gercektenBagli) {
            const sn = Math.floor((Date.now() - sesBaglanmaZaman) / 1000);
            const g  = Math.floor(sn / 86400);
            const s  = Math.floor((sn % 86400) / 3600);
            const d  = Math.floor((sn % 3600) / 60);
            const sc = sn % 60;
            uptimeStr = [g > 0 ? `${g}g` : '', s > 0 ? `${s}s` : '', d > 0 ? `${d}d` : '', `${sc}sn`].filter(Boolean).join(' ');
        }

        const embed = new EmbedBuilder()
            .setColor(gercektenBagli ? '#00FF88' : '#FF4444')
            .setTitle(`${gercektenBagli ? '🟢' : '🔴'} 7/24 Ses Kanalı Durumu`)
            .addFields(
                { name: '📡 Bağlantı',      value: gercektenBagli ? '✅ Bağlı' : '❌ Bağlı Değil', inline: true },
                { name: '🎙️ Kanal',         value: `<#${SES_KANAL_ID}>`, inline: true },
                { name: '⏱️ Uptime',        value: uptimeStr, inline: true },
                { name: '🔒 Sistem',        value: sesAktif ? '✅ Aktif' : '⏸️ Durduruldu', inline: true },
                { name: '🔄 Deneme',        value: String(sesDenemeSayisi), inline: true },
                { name: '🌐 Platform',      value: 'Render (Gateway Modu)', inline: true },
            )
            .setTimestamp()
            .setFooter({ text: 'Eko Yıldız | 7/24 Ses Sistemi v2.0' });

        await interaction.reply({ embeds: [embed], flags: 64 });
    },
};
