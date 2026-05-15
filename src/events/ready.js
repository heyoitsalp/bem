const { Events } = require('discord.js');
const { rankList, ROBLOX_COOKIE } = require('../modules/constants');
const { getGroupRoles } = require('../modules/robloxApi');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`[🤖] ${client.user.tag} olarak giriş yapıldı!`);
        console.log(`[📊] ${client.guilds.cache.size} sunucuda aktif.`);
        console.log(`[📋] ${rankList.length} rütbe yüklendi.`);
        
        client.user.setActivity('Sentura 🦸 ekoyildiz | /yardim', { type: 4 });

        // Başlangıçta grup rollerini önbelleğe al
        if (ROBLOX_COOKIE) {
            await getGroupRoles();
        }

        // Geçici ban/mute kontrolü - her dakika çalışır
        setInterval(() => checkExpiredPunishments(client, config), 60000);
    },
};
