const { config } = require('./constants');

class VoiceManager {
    constructor(client) {
        this.client = client;
        this.SES_GUILD_ID = config.GUILD_ID;
        this.SES_KANAL_ID = '1367646465492258847';
        this.SES_YENILE_MS = 60000;
        
        this.sesAktif = true;
        this.sesBagliMi = false;
        this.sesBaglanmaZaman = null;
        this.sesDenemeSayisi = 0;
    }

    connect() {
        if (!this.sesAktif) return;
        
        try {
            const guild = this.client.guilds.cache.get(this.SES_GUILD_ID);
            if (!guild) return;

            this.sesDenemeSayisi++;
            console.log(`[🔊 SES] Ses kanalına bağlanma denemesi #${this.sesDenemeSayisi}...`);

            guild.shard.send({
                op: 4,
                d: {
                    guild_id:   this.SES_GUILD_ID,
                    channel_id: this.SES_KANAL_ID,
                    self_mute:  false,
                    self_deaf:  false,
                }
            });

            this.sesBagliMi = true;
            if (!this.sesBaglanmaZaman) this.sesBaglanmaZaman = Date.now();
        } catch (err) {
            console.error('[❌ SES] Bağlantı hatası:', err.message);
            this.sesBagliMi = false;
        }
    }

    disconnect() {
        try {
            const guild = this.client.guilds.cache.get(this.SES_GUILD_ID);
            if (!guild) return;

            guild.shard.send({
                op: 4,
                d: {
                    guild_id:   this.SES_GUILD_ID,
                    channel_id: null,
                    self_mute:  false,
                    self_deaf:  false,
                }
            });

            this.sesBagliMi = false;
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
            } else {
                if (this.sesBaglanmaZaman) {
                    const uptimeSn = Math.floor((Date.now() - this.sesBaglanmaZaman) / 1000);
                    if (uptimeSn % 600 < 60) {
                        const d = Math.floor(uptimeSn / 86400);
                        const s = Math.floor((uptimeSn % 86400) / 3600);
                        const dk = Math.floor((uptimeSn % 3600) / 60);
                        console.log(`[🔊 SES] Ses kanalında aktif — Uptime: ${d}g ${s}s ${dk}d`);
                    }
                }
            }
        } catch (err) {
            console.error('[❌ SES] Kontrol hatası:', err.message);
        }
    }

    getStatus() {
        return {
            sesAktif: this.sesAktif,
            sesBagliMi: this.sesBagliMi,
            sesBaglanmaZaman: this.sesBaglanmaZaman,
            sesDenemeSayisi: this.sesDenemeSayisi,
            SES_KANAL_ID: this.SES_KANAL_ID,
            SES_GUILD_ID: this.SES_GUILD_ID
        };
    }
}

module.exports = VoiceManager;
