// ============================================================
//  UTILITY FUNCTIONS & GREETING SYSTEM
// ============================================================

const {
    YOUTUBE_ABONE_LINK,
    YOUTUBE_UYE_LINK,
    HG_RENK,
    HG_ULER_ROL_ID,
    SELAMLAMA_COOLDOWN_MS,
} = require('./constants');

// ============================================================
//  IN-MEMORY DATA STORES
// ============================================================
const selamlamaCooldown = new Map();
const kullaniciRuhuHali = new Map();

let hgIstatistik = { toplamKatilan: 0, bugunKatilan: 0, tarih: new Date().toISOString().slice(0, 10) };

// ============================================================
//  GREETING PATTERNS
// ============================================================
const selamlamaDesenleri = [
    {
        regex: /\b(selam|selamlar|hey|heyy|heyyy|heyyyy|merhaba|mrb|slm|sln|sa|slmm|slmlar|selamünaleyküm)\b/i,
        tip: 'selam',
        emoji: '👋'
    },
    {
        regex: /\b(günayd[ıi]n|gunaydin|günaydın|gün aydın|gnaydın|g\.a\.?)\b/i,
        tip: 'günaydın',
        emoji: '☀️'
    },
    {
        regex: /\b(tünayd[ıi]n|tunaydın|tünaydın|tn\b)\b/i,
        tip: 'tünaydın',
        emoji: '🌤️'
    },
    {
        regex: /\b(iyi ak[sş]amlar?|iyi aksam|iyi akşam)\b/i,
        tip: 'iyi akşamlar',
        emoji: '🌆'
    },
    {
        regex: /\b(iyi geceler?|iyi gece|i\.g\.?)\b/i,
        tip: 'iyi geceler',
        emoji: '🌙'
    },
    {
        regex: /\b(iyi uykular?|tatl[ıi] r[üu]yalar?|iyi dinlenmeler?)\b/i,
        tip: 'iyi uykular',
        emoji: '😴'
    },
    {
        regex: /\b(hay[ıi]rl[ıi] cumalar?|hayırlı cuma|h\.c\.?)\b/i,
        tip: 'hayırlı cuma',
        emoji: '🕌'
    },
    {
        regex: /\b(selamun aleyk[üu]m|selamın aleyküm|selamunaleyküm|s\.a\.?|^sa$)\b/i,
        tip: 'selamun aleyküm',
        emoji: '🤝'
    },
    {
        regex: /\b(iyi günler?|iyi gunler?|i\.g\.?)\b/i,
        tip: 'iyi günler',
        emoji: '🌟'
    },
    {
        regex: /\b(nas[ıi]ls[ıi]n|nas[ıi]ls[ıi]n[ıi]z|naber|ne haber|n'aber|nbr|nabers)\b/i,
        tip: 'nasılsın',
        emoji: '😊'
    },
    {
        regex: /\b(ne yap[ıi]yorsun|ne yap[ıi]yorsunuz|napıyorsun|nap[ıi]yon|n[ae]p[ıi]yorsun)\b/i,
        tip: 'ne yapıyorsun',
        emoji: '🤔'
    },
    {
        regex: /\b(iyi bayramlar?|hay[ıi]rl[ıi] bayramlar?|bayram[ıi]n[ıi]z mübarek)\b/i,
        tip: 'iyi bayramlar',
        emoji: '🎉'
    },
    {
        regex: /\b(ho[sş] geldin|ho[sş] bulduk|ho[sş] geldiniz)\b/i,
        tip: 'hoş geldin',
        emoji: '🎊'
    },
    {
        regex: /\b(görü[sş]ürüz|g[oö]r[uü][sş]r[uü]z|güle güle|g\.g\.?|bb|byebye|bye|bby|hoşça kal|ho[sş][cç]a kal)\b/i,
        tip: 'görüşürüz',
        emoji: '👋'
    },
];

// ============================================================
//  RESPONSE POOLS
// ============================================================
const cevapHavuzu = {
    'selam': [
        (u) => `Selam ${u}! 👋 Nasıl gidiyor, her şey yolunda mı?`,
        (u) => `Hey hey, ${u} gelmiş! 😄 Ne var ne yok?`,
        (u) => `Merhaba ${u}! 🌟 Seni görmek güzel!`,
        (u) => `Selam ${u} 👋 Umarım günün harika geçiyordur!`,
        (u) => `Oo, ${u}! Selam selam! 😁 Ne alemdesin?`,
        (u) => `Hey ${u}! 🎉 Aramıza hoşgeldin, nasılsın?`,
        (u) => `Merhaba ${u} 🌺 Bugün nasıl gidiyor?`,
        (u) => `Selam ${u}! ✨ Seni gördüm, biraz daha güzelleşti burası 😄`,
        (u) => `Heyy ${u}! 😊 Naber, ne alemdesin?`,
        (u) => `Selamlar ${u}! 🤗 Umarım güzel bir gün geçiriyorsundur!`,
    ],
    'günaydın': [
        (u) => `Günaydın ${u}! ☀️ Umarım güzel bir gün geçirirsin!`,
        (u) => `Günaydın ${u}! 🌅 Yeni bir gün, yeni fırsatlar! Neşeli bir gün dilerim!`,
        (u) => `Günaydın ${u} ☕ Kahveni al, güzel bir gün seni bekliyor!`,
        (u) => `Günaydın ${u}! 🌞 Gün aydın olsun, enerjin bol olsun!`,
        (u) => `Günaydın ${u} 🌻 Bugün harika bir gün olacak, hissediyorum!`,
    ],
    'tünaydın': [
        (u) => `Tünaydın ${u}! 🌤️ Günün nasıl geçiyor?`,
        (u) => `Tünaydın ${u} 😊 Öğleden sonranın keyfini çıkar!`,
        (u) => `Tünaydın ${u}! 🌻 Umarım öğleden sonran verimli ve güzel geçiyor!`,
    ],
    'iyi akşamlar': [
        (u) => `İyi akşamlar ${u}! 🌆 Günün nasıl geçti?`,
        (u) => `İyi akşamlar ${u} 🌇 Huzurlu bir akşam dilerim!`,
        (u) => `İyi akşamlar ${u}! ✨ Keyifli bir akşam geçirmeni dilerim!`,
    ],
    'iyi geceler': [
        (u) => `İyi geceler ${u}! 🌙 Tatlı rüyalar!`,
        (u) => `İyi geceler ${u} 😴 Dinlendirici bir uyku dilerim!`,
        (u) => `İyi geceler ${u}! 🌟 Güzel rüyalar görmeni dilerim!`,
    ],
    'nasılsın': [
        (u) => `İyiyim teşekkürler ${u}! 😊 Sen nasılsın?`,
        (u) => `Süperim ${u}, sormana sevindim! 🌟 Ya sen?`,
        (u) => `Harika hissediyorum ${u}! ✨ Bugün nasılsın sen?`,
    ],
    'görüşürüz': [
        (u) => `Görüşürüz ${u}! 👋 İyi günler dilerim!`,
        (u) => `Güle güle ${u}! 😊 Yakında görüşmek üzere!`,
        (u) => `Bye bye ${u}! ✌️ Güzel günler!`,
    ],
};

// ============================================================
//  HELPER FUNCTIONS
// ============================================================

function rastgeleCevap(havuz, kullaniciAdi) {
    const fn = havuz[Math.floor(Math.random() * havuz.length)];
    return fn(kullaniciAdi);
}

function hgGunlukSifirla() {
    const bugun = new Date().toISOString().slice(0, 10);
    if (hgIstatistik.tarih !== bugun) {
        hgIstatistik.bugunKatilan = 0;
        hgIstatistik.tarih = bugun;
    }
}

function hesapGuvenligiHesapla(createdTimestamp) {
    const yasiGun = Math.floor((Date.now() - createdTimestamp) / 86400000);
    if (yasiGun < 3)  return { seviye: 'Çok Düşük', emoji: '🔴', renk: '#FF0000', puan: 1 };
    if (yasiGun < 7)  return { seviye: 'Düşük',     emoji: '🟠', renk: '#FF6600', puan: 2 };
    if (yasiGun < 30) return { seviye: 'Orta',       emoji: '🟡', renk: '#FFD700', puan: 3 };
    if (yasiGun < 90) return { seviye: 'İyi',        emoji: '🟢', renk: '#00CC44', puan: 4 };
    return               { seviye: 'Güvenli',         emoji: '✅', renk: '#00FF88', puan: 5 };
}

function katilimRozeti(sira) {
    if (sira === 1)   return '👑 İlk Üye!';
    if (sira <= 5)    return '🥇 İlk 5!';
    if (sira <= 10)   return '🥈 İlk 10!';
    if (sira <= 50)   return '🥉 İlk 50!';
    if (sira <= 100)  return '💎 İlk 100!';
    if (sira <= 500)  return '🌟 İlk 500!';
    if (sira <= 1000) return '⭐ İlk 1000!';
    return `#${sira}. Üye`;
}

function haftaninGunu() {
    const gunler = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    return gunler[new Date().getDay()];
}

function sirayaGoreRenk(sira) {
    if (sira === 1)  return '#FFD700';
    if (sira <= 10)  return '#C0C0C0';
    if (sira <= 50)  return '#CD7F32';
    if (sira <= 100) return '#00BFFF';
    return '#FFD700';
}

// ============================================================
//  EKO YILDIZ HELPER
// ============================================================
function ekoFotografVarMi(message) {
    return message.attachments.size > 0 || message.embeds.length > 0;
}

function ekoGuncelleIstatistik(userId) {
    const mevcutVeri = ekoAbonerDatabase.get(userId) || { count: 0, lastPhotoAt: null, totalPhotos: 0 };
    mevcutVeri.count = (mevcutVeri.count || 0) + 1;
    mevcutVeri.lastPhotoAt = new Date();
    mevcutVeri.totalPhotos = (mevcutVeri.totalPhotos || 0) + 1;
    ekoAbonerDatabase.set(userId, mevcutVeri);
    
    // Daily stats
    const bugun = new Date().toISOString().slice(0, 10);
    ekoDailyStats.set(bugun, (ekoDailyStats.get(bugun) || 0) + 1);
    
    return { fotoSayi: mevcutVeri.count, totalPhotos: mevcutVeri.totalPhotos };
}

module.exports = {
    // Data stores
    selamlamaCooldown,
    kullaniciRuhuHali,
    hgIstatistik,
    
    // Patterns & responses
    selamlamaDesenleri,
    cevapHavuzu,
    
    // Helper functions
    rastgeleCevap,
    hgGunlukSifirla,
    hesapGuvenligiHesapla,
    katilimRozeti,
    haftaninGunu,
    sirayaGoreRenk,
    ekoFotografVarMi,
    ekoGuncelleIstatistik,
};
