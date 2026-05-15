const { Events } = require('discord.js');
const { selamlamaDesenleri, cevapHavuzu, rastgeleCevap } = require('../modules/selamlamaUtils');

const selamlamaCooldown = new Map();
const COOLDOWN_MS = 6000;

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot) return;
        if (!message.guild) return;

        const icerik = message.content.trim().toLowerCase();
        if (!icerik) return;

        // Desen eşleşmesi kontrol et
        const eslesen = selamlamaDesenleri.find(d => d.regex.test(icerik));
        if (!eslesen) return;

        // Cooldown kontrolü
        const cooldownKey = `${message.author.id}_${message.channelId}`;
        const sonSelam = selamlamaCooldown.get(cooldownKey);
        if (sonSelam && (Date.now() - sonSelam < COOLDOWN_MS)) return;

        selamlamaCooldown.set(cooldownKey, Date.now());

        const havuz = cevapHavuzu[eslesen.tip];
        const cevap = rastgeleCevap(havuz, message.member?.displayName || message.author.username);

        if (cevap) {
            try {
                await message.reply({ content: cevap });
            } catch (error) {
                console.error('[SELAMLAMA HATA]', error);
            }
        }
    },
};
