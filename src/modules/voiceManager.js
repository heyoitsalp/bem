const { config } = require('./constants');

class VoiceManager {
    constructor(client) {
        this.client = client;
        this.sesAktif = true;
        this.sesBagliMi = false;
        this.sesDenemeSayisi = 0;
        this.sesBaglanmaZaman = null;
        this.SES_KANAL_ID = config.VOICE_CHANNEL_ID;
        this.SES_GUILD_ID = config.GUILD_ID;
        this.SES_YENILE_MS = 300000; // 5 dakika
    }

    async connect() {
        if (!this.sesAktif || !this.SES_KANAL_ID) return;

        try {
            const guild = this.client.guilds.cache.get(this.SES_GUILD_ID);
            if (!guild) return console.error('[❌ SES] Sunucu bulunamadı.');

            guild.shard.send({
                op: 4,
                d: {
                    guild_id: this.SES_GUILD_ID,
                    channel_id: this.SES_KANAL_ID,
                    self_mute: false,
                    self_deaf: true,
                }
            });

            this.sesBagliMi = true;
            this.sesDenemeSayisi++;
            if (!this.sesBaglanmaZaman) this.sesBaglanmaZaman = Date.now();
            console.log(`[🔊 SES] Ses kanalına bağlanma isteği gönderildi. Deneme: ${this.sesDenemeSayisi}`);
        } catch (err) {
            console.error('[❌ SES] Bağlantı hatası:', err.message);
        }
    }

    async disconnect() {
        try {
            const guild = this.client.guilds.cache.get(this.SES_GUILD_ID);
            if (!guild) return;

            guild.shard.send({
                op: 4,
                d: {
                    guild_id: this.SES_GUILD_ID,
                    channel_id: null,
                    self_mute: false,
                    self_deaf: false,
                }
            });

            this.sesBagliMi = false;
            this.sesAktif = false;
            console.log('[🔴 SES] Ses kanalından çıkıldı.');
        } catch (err) {
            console.error('[❌ SES] Çıkış hatası:', err.message);
        }
    }

    checkConnection() {
        if (!this.sesAktif) return;

        try {
            const guild = this.client.guilds.cache.get(this.SES_GUILD_ID);
            if (!guild) return;

            const botVoiceState = guild.voiceStates.cache.get(this.client.user.id);

            if (!botVoiceState || botVoiceState.channelId !== this.SES_KANAL_ID) {
                console.warn('[⚠️ SES] Bot ses kanalında değil, yeniden bağlanılıyor...');
                this.sesBagliMi = false;
                this.connect();
            }
        } catch (err) {
            console.error('[❌ SES] Kontrol hatası:', err.message);
        }
    }

    getStatus() {
        return {
            active: this.sesAktif,
            connected: this.sesBagliMi,
            attempts: this.sesDenemeSayisi,
            uptime: this.sesBaglanmaZaman ? Date.now() - this.sesBaglanmaZaman : 0
        };
    }
}

module.exports = VoiceManager;
