const { Events } = require('discord.js');
const { KAYIT_KANAL_ID } = require('../modules/constants');
const { kayitKarsilamaMesajiniGonder, getKayitKarsilamaMesajId } = require('../modules/kayitUtils');

module.exports = {
    name: Events.MessageDelete,
    async execute(message, client) {
        const kayitKarsilamaMesajId = getKayitKarsilamaMesajId();
        if (!kayitKarsilamaMesajId) return;
        if (message.channelId !== KAYIT_KANAL_ID) return;
        if (message.id !== kayitKarsilamaMesajId) return;

        console.log('[⚠️ KAYIT] Karşılama mesajı silindi, yeniden gönderiliyor...');
        setTimeout(() => kayitKarsilamaMesajiniGonder(client), 2000);
    },
};
