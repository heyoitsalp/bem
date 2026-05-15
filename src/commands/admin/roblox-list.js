const { SlashCommandBuilder } = require('discord.js');
const { robloxServers } = require('../../api');
const EmbedFactory = require('../../modules/embedFactory');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roblox-list')
        .setDescription('Aktif Roblox sunucularını ve oyuncu sayılarını listeler.'),
    async execute(interaction, client) {
        const servers = Array.from(robloxServers.entries());
        
        if (servers.length === 0) {
            return interaction.reply({ 
                embeds: [EmbedFactory.info('Roblox Sunucuları', 'Şu an aktif bildirim gönderen Roblox sunucusu bulunmuyor.')], 
                flags: 64 
            });
        }

        const fields = servers.map(([id, data]) => {
            return {
                name: `Server ID: ${id.substring(0, 8)}...`,
                value: `📍 Place ID: ${data.placeId}\n👥 Oyuncular: ${data.players.length}\n🚫 Banlı Giriş Denemesi: ${data.bans.length}\n🕒 Son Güncelleme: <t:${Math.floor(data.lastUpdate / 1000)}:R>`,
                inline: false
            };
        });

        const embed = EmbedFactory.create({
            title: '🌐 Aktif Roblox Sunucuları',
            color: '#0099FF',
            fields: fields.slice(0, 25), // Discord limit
            footer: 'Sentura Global Mod-System'
        });

        return interaction.reply({ embeds: [embed] });
    },
};
