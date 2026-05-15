const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ses-durum')
        .setDescription('Botun ses kanalı bağlantı durumunu gösterir.'),
    async execute(interaction, client) {
        const status = client.voiceManager.getStatus();
        
        let uptimeStr = 'Bilinmiyor';
        if (status.uptime > 0) {
            const sn = Math.floor(status.uptime / 1000);
            const g  = Math.floor(sn / 86400);
            const s  = Math.floor((sn % 86400) / 3600);
            const d  = Math.floor((sn % 3600) / 60);
            const sc = sn % 60;
            uptimeStr = [g > 0 ? `${g}g` : '', s > 0 ? `${s}s` : '', d > 0 ? `${d}d` : '', `${sc}sn`].filter(Boolean).join(' ');
        }

        const embed = new EmbedBuilder()
            .setColor(status.connected ? '#00FF88' : '#FF4444')
            .setTitle(`${status.connected ? '🟢' : '🔴'} 7/24 Ses Kanalı Durumu`)
            .addFields(
                { name: '📡 Bağlantı',      value: status.connected ? '✅ Bağlı' : '❌ Bağlı Değil', inline: true },
                { name: '🎙️ Kanal',         value: `<#${client.voiceManager.SES_KANAL_ID}>`, inline: true },
                { name: '⏱️ Uptime',        value: uptimeStr, inline: true },
                { name: '🔒 Sistem',        value: status.active ? '✅ Aktif' : '⏸️ Durduruldu', inline: true },
                { name: '🔄 Deneme',        value: String(status.attempts), inline: true },
                { name: '🌐 Platform',      value: 'Render (Gateway Modu)', inline: true },
            )
            .setTimestamp()
            .setFooter({ text: 'Eko Yıldız | 7/24 Ses Sistemi v2.0' });

        return interaction.reply({ embeds: [embed], flags: 64 });
    },
};
