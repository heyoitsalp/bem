const selamlamaDesenleri = [
    { regex: /\b(selam|selamlar|hey|heyy|heyyy|merhaba|mrb|slm|sa|slmm|slmlar|selamünaleyküm)\b/i, tip: 'selam', emoji: '👋' },
    { regex: /\b(günayd[ıi]n|gunaydin|günaydın|g\.a\.?)\b/i, tip: 'günaydın', emoji: '☀️' },
    { regex: /\b(tünayd[ıi]n|tunaydın|tünaydın|tn\b)\b/i, tip: 'tünaydın', emoji: '🌤️' },
    { regex: /\b(iyi ak[sş]amlar?|iyi aksam|iyi akşam)\b/i, tip: 'iyi akşamlar', emoji: '🌆' },
    { regex: /\b(iyi geceler?|iyi gece|i\.g\.?)\b/i, tip: 'iyi geceler', emoji: '🌙' },
    { regex: /\b(iyi uykular?|tatl[ıi] r[üu]yalar?|iyi dinlenmeler?)\b/i, tip: 'iyi uykular', emoji: '😴' },
    { regex: /\b(hay[ıi]rl[ıi] cumalar?|hayırlı cuma|h\.c\.?)\b/i, tip: 'hayırlı cuma', emoji: '🕌' },
    { regex: /\b(selamun aleyk[üu]m|selamın aleyküm|selamunaleyküm|s\.a\.?|^sa$)\b/i, tip: 'selamun aleyküm', emoji: '🤝' },
    { regex: /\b(iyi günler?|iyi gunler?|i\.g\.?)\b/i, tip: 'iyi günler', emoji: '🌟' },
    { regex: /\b(nas[ıi]ls[ıi]n|nas[ıi]ls[ıi]n[ıi]z|naber|ne haber|n'aber|nbr|nabers)\b/i, tip: 'nasılsın', emoji: '😊' },
    { regex: /\b(ne yap[ıi]yorsun|ne yap[ıi]yorsunuz|napıyorsun|nap[ıi]yon|n[ae]p[ıi]yorsun)\b/i, tip: 'ne yapıyorsun', emoji: '🤔' },
    { regex: /\b(iyi bayramlar?|hay[ıi]rl[ıi] bayramlar?|bayram[ıi]n[ıi]z mübarek)\b/i, tip: 'iyi bayramlar', emoji: '🎉' },
    { regex: /\b(ho[sş] geldin|ho[sş] bulduk|ho[sş] geldiniz)\b/i, tip: 'hoş geldin', emoji: '🎊' },
    { regex: /\b(görü[sş]ürüz|g[oö]r[uü][sş]r[uü]z|güle güle|g\.g\.?|bb|byebye|bye|bby|hoşça kal|ho[sş][cç]a kal)\b/i, tip: 'görüşürüz', emoji: '👋' },
    { regex: /\b(iyiyim|iyi|süperim|s[uü]per|iyidir|[cç]ok [sş][uü]k[uü]r|bomba gibiyim)\b/i, tip: 'iyiyim', emoji: '✨' },
];

const cevapHavuzu = {
    'selam': [
        (u) => `Selam ${u}! 👋 Nasıl gidiyor, her şey yolunda mı?`,
        (u) => `Hey hey, ${u} gelmiş! 😄 Ne var ne yok?`,
        (u) => `Merhaba ${u}! 🌟 Seni görmek güzel!`,
        (u) => `Selam ${u}! ✨ Seni gördüm, biraz daha güzelleşti burası 😄`,
        (u) => `Heyy ${u}! 😊 Naber, ne alemdesin?`,
    ],
    'günaydın': [
        (u) => `Günaydın ${u}! ☀️ Umarım güzel bir gün geçirirsin!`,
        (u) => `Günaydın ${u}! 🌅 Yeni bir gün, yeni fırsatlar! Neşeli bir gün dilerim!`,
        (u) => `Günaydın ${u} ☕ Kahveni al, güzel bir gün seni bekliyor!`,
    ],
    'tünaydın': [
        (u) => `Tünaydın ${u}! 🌤️ Günün nasıl geçiyor?`,
        (u) => `Tünaydın ${u} 😊 Öğleden sonranın keyfini çıkar!`,
    ],
    'iyi akşamlar': [
        (u) => `İyi akşamlar ${u}! 🌆 Günün nasıl geçti?`,
        (u) => `İyi akşamlar ${u} 🌇 Huzurlu bir akşam dilerim!`,
        (u) => `İyi akşamlar ${u}! ✨ Keyifli bir akşam geçirmeni dilerim!`,
    ],
    'iyi geceler': [
        (u) => `İyi geceler ${u}! 🌙 Tatlı rüyalar!`,
        (u) => `İyi geceler ${u} 😴 Dinlendirici bir uyku dilerim!`,
    ],
    'iyi uykular': [
        (u) => `İyi uykular ${u}! 😴🌙 Tatlı rüyalar dilerim!`,
        (u) => `İyi uykular ${u} 💤 Dinlendirici geceler!`,
    ],
    'hayırlı cuma': [
        (u) => `Hayırlı Cumalar ${u}! 🤲 Cuma gününüz mübarek olsun!`,
        (u) => `Hayırlı Cumalar ${u} 🕌 Allah kabul etsin, hayırlar getirsin!`,
    ],
    'selamun aleyküm': [
        (u) => `Ve Aleyküm Selam ${u}! 🤝 Nasılsın, hayırlı işler!`,
        (u) => `Ve Aleyküm Selam ${u} 🌟 Hoşgeldin, ne var ne yok?`,
        (u) => `Ve Aleyküm Selam ve Rahmetullahi ve Berakatühü ${u}! 🤲 Nasılsın?`,
    ],
    'iyi günler': [
        (u) => `İyi günler ${u}! 🌟 Umarım güzel bir gün geçiriyorsundur!`,
        (u) => `İyi günler ${u} ☀️ Sana da iyi günler!`,
    ],
    'nasılsın': [
        (u) => `İyiyim teşekkürler ${u}! 😊 Sen nasılsın?`,
        (u) => `Süperim ${u}, sormana sevindim! 🌟 Ya sen?`,
    ],
    'ne yapıyorsun': [
        (u) => `Sunucuyu koruyorum ${u}! 🦸 Sen ne yapıyorsun?`,
        (u) => `Herkese yardım etmeye çalışıyorum ${u} 😄 Sen?`,
    ],
    'iyi bayramlar': [
        (u) => `Bayramın kutlu olsun ${u}! 🎉 Bol şeker, bol neşe dilerim!`,
        (u) => `İyi bayramlar ${u}! 🎊 Bayramın sağlık ve mutlulukla geçsin!`,
    ],
    'hoş geldin': [
        (u) => `Hoş bulduk ${u}! 😊 Aramıza katıldığın için memnunuz!`,
    ],
    'görüşürüz': [
        (u) => `Görüşürüz ${u}! 👋 İyi günler dilerim!`,
        (u) => `Güle güle ${u}! 😊 Yakında görüşmek üzere!`,
    ],
    'iyiyim': [
        (u) => `Mükemmel! Hep iyi ol ${u}! ✨`,
        (u) => `Harika! Duyduğuma sevindim ${u}. Hep böyle neşeli kal! 😊`,
        (u) => `Süper! Senin iyi olman beni de mutlu etti ${u}! 🌟`,
        (u) => `Hep iyi ol ${u}! Nazar değmesin 🧿`,
    ]
};

function rastgeleCevap(havuz, kullaniciAdi) {
    const options = havuz || [];
    if (options.length === 0) return null;
    const fn = options[Math.floor(Math.random() * options.length)];
    return fn(kullaniciAdi);
}

module.exports = { selamlamaDesenleri, cevapHavuzu, rastgeleCevap };
