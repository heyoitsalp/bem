const { KAYIT_GUILD_ID, KAYIT_KANAL_ID, KAYIT_KARSILAMA_ICERIK } = require('./constants');

let kayitKarsilamaMesajId = null;

async function kayitKarsilamaMesajiniGonder(client) {
    try {
        const guild = await client.guilds.fetch(KAYIT_GUILD_ID).catch(() => null);
        if (!guild) return;
        const kanal = await guild.channels.fetch(KAYIT_KANAL_ID).catch(() => null);
        if (!kanal) return;

        const mesajlar = await kanal.messages.fetch({ limit: 50 }).catch(() => null);
        if (mesajlar) {
            const mevcutMesaj = mesajlar.find(
                m => m.author.id === client.user.id && m.pinned && m.content === KAYIT_KARSILAMA_ICERIK
            );
            if (mevcutMesaj) {
                kayitKarsilamaMesajId = mevcutMesaj.id;
                console.log('[📌 KAYIT] Karşılama mesajı zaten mevcut, izleniyor.');
                return;
            }
        }

        const yeniMesaj = await kanal.send(KAYIT_KARSILAMA_ICERIK);
        kayitKarsilamaMesajId = yeniMesaj.id;

        await yeniMesaj.pin().catch(() => {});
        console.log('[📌 KAYIT] Karşılama mesajı gönderildi ve sabitlendi.');

        // Sistem mesajını sil
        setTimeout(async () => {
            const sonMesajlar = await kanal.messages.fetch({ limit: 5 }).catch(() => null);
            if (sonMesajlar) {
                const sistemMesaji = sonMesajlar.find(m => m.system && m.type === 6);
                if (sistemMesaji) await sistemMesaji.delete().catch(() => {});
            }
        }, 3000);

    } catch (err) {
        console.error('[❌ KAYIT] Karşılama mesajı gönderilemedi:', err.message);
    }
}

module.exports = { kayitKarsilamaMesajiniGonder, getKayitKarsilamaMesajId: () => kayitKarsilamaMesajId };
