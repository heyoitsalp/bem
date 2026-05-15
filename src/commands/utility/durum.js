const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { status } = require('../api');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('durum')
        .setDescription('Tüm sistemlerin mevcut durumunu gösterir.'),
    async execute(interaction, client) {
        const voiceStatus = client.voiceManager.getStatus();
        
        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('📊 Sistem Durumları')
            .setDescription('Sentura 🦸 ekoyildiz sistematik durum paneli')
            .addFields(
                { name: '🎮 Oyun', value: status.isGameOpen ? '🟢 AÇIK' : '🔴 KAPALI', inline: true },
                { name: '🛒 Rütbe Marketi', value: status.isMarketOpen ? '🟢 AÇIK' : '🔴 KAPALI', inline: true },
                { name: '⚖️ Adalet Sarayı', value: status.isAdaletSarayOpen ? '🟢 AÇIK' : '🔴 KAPALI', inline: true },
                { name: '🔊 Ses Sistemi', value: voiceStatus.connected ? '🟢 BAĞLI' : '🔴 BAĞLI DEĞİL', inline: true },
                { name: '🤖 Bot Gecikme', value: `${client.ws.ping}ms`, inline: true },
                { name: '👥 Sunucu Üye', value: `${interaction.guild.memberCount}`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Sentura 🦸 ekoyildiz Sistemleri' });
            
        await interaction.reply({ embeds: [embed] });
    },
};
