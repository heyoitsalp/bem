const {
    Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes,
    EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder,
    ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder,
    TextInputStyle, AuditLogEvent, Collection
} = require('discord.js');
const { status, startApi } = require('./api');
const config = require('./config.json');

// ============================================================
//  ROBLOX GRUP VE API AYARLARI
// ============================================================
const ROBLOX_GROUP_ID = 8505535;
const ROBLOX_COOKIE = (process.env.ROBLOX_COOKIE || '').trim(); // Render'da environment variable olarak ekle

// ============================================================
//  RÜTBE LİSTESİ — Grup ID: 8505535 (Guest hariç tümü)
// ============================================================
const rankList = [
    { name: "Polis",                              id: 1   },
    { name: "Akademi Adayı",                      id: 2   },
    { name: "Akademi",                            id: 3   },
    { name: "Polis Memuru Adayı",                 id: 6   },
    { name: "Polis Memuru",                       id: 7   },
    { name: "Kıdemli Polis Memuru",               id: 8   },
    { name: "Başpolis Memuru Adayı",              id: 9   },
    { name: "Başpolis Memuru",                    id: 10  },
    { name: "Kıdemli Başpolis Memuru",            id: 11  },
    { name: "Uzm. Başpolis Memuru",               id: 12  },
    { name: "Aday Komiser",                       id: 13  },
    { name: "Emekli Personel",                    id: 14  },
    { name: "Stajyer Komiser",                    id: 15  },
    { name: "Komiser Yardımcısı",                 id: 16  },
    { name: "Askomiser",                          id: 17  },
    { name: "Komiser",                            id: 18  },
    { name: "Üskomiser",                          id: 19  },
    { name: "Başkomiser",                         id: 20  },
    { name: "Amir Adayı",                         id: 21  },
    { name: "Emniyet Amiri",                      id: 22  },
    { name: "Müdür",                              id: 23  },
    { name: "4. Sınıf Emniyet Müdürü",            id: 24  },
    { name: "3. Sınıf Emniyet Müdürü",            id: 25  },
    { name: "2. Sınıf Emniyet Müdürü",            id: 26  },
    { name: "1. Sınıf Emniyet Müdürü",            id: 27  },
    { name: "Emniyet Genel Müdürü",               id: 28  },
    { name: "Teftiş Kurulu",                      id: 29  },
    { name: "Teftiş Kurulu Başkan Yardımcısı",    id: 30  },
    { name: "Teftiş Kurulu Başkanı",              id: 31  },
    { name: "Yüksek Polis Kurulu",                id: 32  },
    { name: "Yönetim Kurulu",                     id: 33  },
    { name: "Yönetim Kurulu Başkan Yardımcısı",   id: 34  },
    { name: "Yönetim Kurulu Başkanı",             id: 36  },
    { name: "Contributor",                        id: 37  },
    { name: "Geliştirme Ekibi",                   id: 250 },
    { name: "Vali",                               id: 252 },
    { name: "Cumhurbaşkanı",                      id: 254 },
    { name: "Proje Uygulaması",                   id: 255 }
];

// ============================================================
//  IN-MEMORY DEPOLAMA (aktif warn/uyarı/unban talepleri vb.)
// ============================================================
// { userId: [ { reason, moderator, timestamp } ] }
const warnDatabase = new Map();

// { caseId: { type, userId, moderatorId, reason, timestamp } }
const modlogDatabase = new Map();
let caseCounter = 1;

// { userId: { expiresAt, reason, moderatorId } }
const tempbanDatabase = new Map();
const tempmuteDatabase = new Map();

// Aktif unban talepleri: { messageId: { userId, reason, requesterId } }
const unbanRequests = new Map();

// ============================================================
//  YARDIMCI FONKSİYONLAR - ROBLOX API
// ============================================================
async function getRobloxUser(username) {
    try {
        const response = await fetch('https://users.roblox.com/v1/usernames/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
        });
        const data = await response.json();
        if (data.data && data.data.length > 0) return data.data[0];
        return null;
    } catch {
        return null;
    }
}

async function getRobloxUserById(userId) {
    try {
        const response = await fetch(`https://users.roblox.com/v1/users/${userId}`);
        const data = await response.json();
        return data || null;
    } catch {
        return null;
    }
}

async function getUserRankInGroup(userId) {
    try {
        const response = await fetch(`https://groups.roblox.com/v1/users/${userId}/groups/roles`);
        const data = await response.json();
        if (data && data.data) {
            const group = data.data.find(g => g.group.id === ROBLOX_GROUP_ID);
            if (group) return { rank: group.role.rank, name: group.role.name };
        }
        return { rank: 0, name: 'Grup Üyesi Değil' };
    } catch {
        return { rank: 0, name: 'API Hatası' };
    }
}

// ============================================================
//  ROBLOX RÜTBE SİSTEMİ — Kendi cookie ile native API
// ============================================================

// Grup rollerini cache'le (her başlatmada bir kez çekilir)
let groupRolesCache = null;

async function getGroupRoles() {
    if (groupRolesCache) return groupRolesCache;
    try {
        const response = await fetch(`https://groups.roblox.com/v1/groups/${ROBLOX_GROUP_ID}/roles`, {
            headers: {
                'Cookie': `.ROBLOSECURITY=${ROBLOX_COOKIE}`
            }
        });
        if (!response.ok) {
            throw new Error(`Grup rolleri alınamadı: ${response.status}`);
        }
        const data = await response.json();
        // roles: [ { id: <gerçek role id>, name, rank, memberCount } ]
        groupRolesCache = data.roles || [];
        console.log(`[✅] ${groupRolesCache.length} grup rolü yüklendi.`);
        return groupRolesCache;
    } catch (err) {
        console.error('[❌] Grup rolleri çekilirken hata:', err.message);
        return [];
    }
}

// Rank numarasından gerçek Roblox role ID'sini bul
async function getRoleIdByRank(rankNumber) {
    const roles = await getGroupRoles();
    const role = roles.find(r => r.rank === rankNumber);
    return role ? role.id : null;
}

// CSRF token al (Roblox API'si POST/PATCH işlemlerinde gerektirir)
async function getCsrfToken() {
    try {
        const response = await fetch('https://auth.roblox.com/v2/logout', {
            method: 'POST',
            headers: {
                'Cookie': `.ROBLOSECURITY=${ROBLOX_COOKIE}`,
                'Content-Length': '0'
            }
        });
        const token = response.headers.get('x-csrf-token');
        if (!token) throw new Error('CSRF token alınamadı');
        return token;
    } catch (err) {
        console.error('[❌] CSRF token hatası:', err.message);
        throw err;
    }
}

async function setRobloxRank(userId, rankNumber) {
    // 1. Rank numarasından gerçek role ID'sini bul
    const roleId = await getRoleIdByRank(rankNumber);
    if (!roleId) {
        throw new Error(`Rank ${rankNumber} için role ID bulunamadı. Grup rolleri cache'ini kontrol edin.`);
    }

    // 2. CSRF token al
    const csrfToken = await getCsrfToken();

    // 3. Rütbeyi ata
    const response = await fetch(`https://groups.roblox.com/v1/groups/${ROBLOX_GROUP_ID}/users/${userId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': `.ROBLOSECURITY=${ROBLOX_COOKIE}`,
            'x-csrf-token': csrfToken
        },
        body: JSON.stringify({ roleId: roleId })
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => 'Bilinmeyen hata');
        throw new Error(`Roblox API Hatası: ${response.status} - ${errText}`);
    }

    return true;
}

async function getGroupMemberCount() {
    try {
        const response = await fetch(`https://groups.roblox.com/v1/groups/${ROBLOX_GROUP_ID}`);
        const data = await response.json();
        return data.memberCount || 0;
    } catch {
        return 0;
    }
}

// ============================================================
//  YARDIMCI FONKSİYONLAR - MODERASYON
// ============================================================
function addModCase(type, userId, moderatorId, reason) {
    const caseId = caseCounter++;
    modlogDatabase.set(caseId, {
        caseId,
        type,
        userId,
        moderatorId,
        reason,
        timestamp: new Date()
    });
    return caseId;
}

function getUserWarnings(userId) {
    return warnDatabase.get(userId) || [];
}

function addWarning(userId, reason, moderatorId) {
    const warns = getUserWarnings(userId);
    warns.push({ reason, moderatorId, timestamp: new Date() });
    warnDatabase.set(userId, warns);
    return warns.length;
}

function removeWarning(userId, index) {
    const warns = getUserWarnings(userId);
    if (index < 0 || index >= warns.length) return false;
    warns.splice(index, 1);
    warnDatabase.set(userId, warns);
    return true;
}

function parseDuration(str) {
    // "10m", "2h", "1d", "30s" formatlarını parse eder
    const match = str.match(/^(\d+)(s|m|h|d)$/i);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return value * multipliers[unit];
}

function formatDuration(ms) {
    if (ms < 60000) return `${Math.floor(ms / 1000)} saniye`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)} dakika`;
    if (ms < 86400000) return `${Math.floor(ms / 3600000)} saat`;
    return `${Math.floor(ms / 86400000)} gün`;
}

// ============================================================
//  YARDIMCI FONKSİYONLAR - EMBED OLUŞTURMA
// ============================================================
function buildModEmbed(title, color, fields, footerText = 'Sentura 🦸 ekoyildiz') {
    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .addFields(fields)
        .setTimestamp()
        .setFooter({ text: footerText });
}

function buildDMEmbed(action, guildName, moderatorTag, reason, extra = '') {
    const colorMap = {
        ban: '#FF0000', kick: '#FF6600', mute: '#FFA500',
        warn: '#FFFF00', tempban: '#CC0000', tempmute: '#FF8C00',
        unban: '#00FF00', unmute: '#00FF00', note: '#00BFFF'
    };
    const iconMap = {
        ban: '🔨', kick: '👢', mute: '🔇', warn: '⚠️',
        tempban: '⏳', tempmute: '⏰', unban: '✅', unmute: '🔊', note: '📝'
    };
    const titleMap = {
        ban: 'Sunucudan Yasaklandınız!',
        kick: 'Sunucudan Atıldınız!',
        mute: 'Susturuldunuz!',
        warn: 'Uyarı Aldınız!',
        tempban: 'Geçici Olarak Yasaklandınız!',
        tempmute: 'Geçici Olarak Susturuldunuz!',
        unban: 'Yasağınız Kaldırıldı!',
        unmute: 'Susturmanız Kaldırıldı!',
        note: 'Hakkınızda Not Eklendi'
    };
    const embed = new EmbedBuilder()
        .setColor(colorMap[action] || '#888888')
        .setTitle(`${iconMap[action]} ${titleMap[action]}`)
        .addFields(
            { name: '🏠 Sunucu', value: guildName, inline: true },
            { name: '👮 Yetkili', value: moderatorTag, inline: true },
            { name: '📋 Sebep', value: reason || 'Belirtilmedi', inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Sentura 🦸 ekoyildiz | İtiraz için yetkililere başvurun.' });
    if (extra) embed.addFields({ name: '📌 Ek Bilgi', value: extra, inline: false });
    return embed;
}

async function sendDM(user, embed) {
    try {
        await user.send({ embeds: [embed] });
        return true;
    } catch {
        return false;
    }
}

// ============================================================
//  LOG KANALI GÖNDERME
// ============================================================
async function sendLog(client, embed) {
    if (!config.LOG_CHANNEL_ID) return;
    try {
        const channel = await client.channels.fetch(config.LOG_CHANNEL_ID);
        if (channel) await channel.send({ embeds: [embed] });
    } catch { /* Log kanalı bulunamazsa sessizce geç */ }
}

// ============================================================
//  CLIENT VE TOKEN
// ============================================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.DISCORD_TOKEN;

// ============================================================
//  KOMUTLARI KAYDETME
// ============================================================
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        const commands = [
            // === OYUN YÖNETİMİ ===
            new SlashCommandBuilder()
                .setName('oyun-yonet')
                .setDescription('Oyunu açar veya kapatır.')
                .addBooleanOption(opt => opt.setName('durum').setDescription('Açık mı?').setRequired(true)),

            new SlashCommandBuilder()
                .setName('market-yonet')
                .setDescription('Rütbe marketini açar veya kapatır.')
                .addBooleanOption(opt => opt.setName('durum').setDescription('Açık mı?').setRequired(true)),

            new SlashCommandBuilder()
                .setName('adaletsarayi-yonet')
                .setDescription('Adalet Sarayını açar veya kapatır.')
                .addBooleanOption(opt => opt.setName('durum').setDescription('Açık mı?').setRequired(true)),

            new SlashCommandBuilder()
                .setName('tumunu-ac')
                .setDescription('Oyun, Market ve Adalet Sarayını aynı anda açar.'),

            new SlashCommandBuilder()
                .setName('tumunu-kapat')
                .setDescription('Tüm sistemleri aynı anda kapatır.'),

            new SlashCommandBuilder()
                .setName('durum')
                .setDescription('Tüm sistemlerin mevcut durumunu gösterir.'),

            // === MODERASYON ===
            new SlashCommandBuilder()
                .setName('ban')
                .setDescription('Kullanıcıyı sunucudan kalıcı olarak yasaklar.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Banlanacak kişi').setRequired(true))
                .addStringOption(opt => opt.setName('sebep').setDescription('Ban sebebi').setRequired(true))
                .addStringOption(opt => opt.setName('mesaj_sil').setDescription('Kaç günlük mesaj silinsin? (0-7)').setRequired(false)),

            new SlashCommandBuilder()
                .setName('tempban')
                .setDescription('Kullanıcıyı belirli süreliğine yasaklar.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Banlanacak kişi').setRequired(true))
                .addStringOption(opt => opt.setName('sure').setDescription('Süre (örn: 10m, 2h, 1d)').setRequired(true))
                .addStringOption(opt => opt.setName('sebep').setDescription('Ban sebebi').setRequired(true)),

            new SlashCommandBuilder()
                .setName('unban')
                .setDescription('Kullanıcının yasağını kaldırır.')
                .addStringOption(opt => opt.setName('kullanici_id').setDescription('Kullanıcı ID').setRequired(true))
                .addStringOption(opt => opt.setName('sebep').setDescription('Unban sebebi').setRequired(false)),

            new SlashCommandBuilder()
                .setName('kick')
                .setDescription('Kullanıcıyı sunucudan atar.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Atılacak kişi').setRequired(true))
                .addStringOption(opt => opt.setName('sebep').setDescription('Atılma sebebi').setRequired(true)),

            new SlashCommandBuilder()
                .setName('mute')
                .setDescription('Kullanıcıya Susturulmuş rolü verir.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Susturulacak kişi').setRequired(true))
                .addStringOption(opt => opt.setName('sebep').setDescription('Susturma sebebi').setRequired(false)),

            new SlashCommandBuilder()
                .setName('tempmute')
                .setDescription('Kullanıcıyı belirli süreliğine susturur.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Susturulacak kişi').setRequired(true))
                .addStringOption(opt => opt.setName('sure').setDescription('Süre (örn: 10m, 2h, 1d)').setRequired(true))
                .addStringOption(opt => opt.setName('sebep').setDescription('Susturma sebebi').setRequired(false)),

            new SlashCommandBuilder()
                .setName('unmute')
                .setDescription('Kullanıcının susturmasını kaldırır.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Susturma kaldırılacak kişi').setRequired(true))
                .addStringOption(opt => opt.setName('sebep').setDescription('Unmute sebebi').setRequired(false)),

            new SlashCommandBuilder()
                .setName('warn')
                .setDescription('Kullanıcıya uyarı verir.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Uyarılacak kişi').setRequired(true))
                .addStringOption(opt => opt.setName('sebep').setDescription('Uyarı sebebi').setRequired(true)),

            new SlashCommandBuilder()
                .setName('warnlist')
                .setDescription('Kullanıcının uyarılarını listeler.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Uyarıları görülecek kişi').setRequired(true)),

            new SlashCommandBuilder()
                .setName('warnremove')
                .setDescription('Kullanıcıdan uyarı kaldırır.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Uyarı kaldırılacak kişi').setRequired(true))
                .addIntegerOption(opt => opt.setName('index').setDescription('Kaldırılacak uyarı numarası (1\'den başlar)').setRequired(true)),

            new SlashCommandBuilder()
                .setName('modlog')
                .setDescription('Kullanıcının moderasyon geçmişini gösterir.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Geçmişi görülecek kişi').setRequired(true)),

            new SlashCommandBuilder()
                .setName('clear')
                .setDescription('Belirtilen sayıda mesajı siler.')
                .addIntegerOption(opt => opt.setName('sayi').setDescription('Silinecek mesaj sayısı (1-100)').setRequired(true))
                .addUserOption(opt => opt.setName('kullanici').setDescription('Sadece bu kişinin mesajlarını sil').setRequired(false)),

            new SlashCommandBuilder()
                .setName('slowmode')
                .setDescription('Kanalda yavaş modu ayarlar.')
                .addIntegerOption(opt => opt.setName('saniye').setDescription('Saniye (0 = kapat)').setRequired(true))
                .addChannelOption(opt => opt.setName('kanal').setDescription('Kanal (boş = mevcut kanal)').setRequired(false)),

            new SlashCommandBuilder()
                .setName('lock')
                .setDescription('Kanalı kilitler (yazma engeli).')
                .addChannelOption(opt => opt.setName('kanal').setDescription('Kanal (boş = mevcut kanal)').setRequired(false))
                .addStringOption(opt => opt.setName('sebep').setDescription('Kilitleme sebebi').setRequired(false)),

            new SlashCommandBuilder()
                .setName('unlock')
                .setDescription('Kanalın kilidini açar.')
                .addChannelOption(opt => opt.setName('kanal').setDescription('Kanal (boş = mevcut kanal)').setRequired(false)),

            // === ROBLOX RÜTBE SİSTEMİ ===
            new SlashCommandBuilder()
                .setName('terfi')
                .setDescription('Kullanıcıyı bir üst rütbeye terfi ettirir.')
                .addStringOption(opt => opt.setName('roblox_adi').setDescription('Roblox kullanıcı adı').setRequired(true)),

            new SlashCommandBuilder()
                .setName('tenzil')
                .setDescription('Kullanıcıyı bir alt rütbeye düşürür.')
                .addStringOption(opt => opt.setName('roblox_adi').setDescription('Roblox kullanıcı adı').setRequired(true)),

            new SlashCommandBuilder()
                .setName('rutbedegistir')
                .setDescription('Kullanıcıya listeden bir rütbe atar.')
                .addStringOption(opt => opt.setName('roblox_adi').setDescription('Roblox kullanıcı adı').setRequired(true))
                .addIntegerOption(opt => opt.setName('rutbe_id').setDescription('Atanacak rütbeyi listeden seçin').setRequired(true).setAutocomplete(true)),

            new SlashCommandBuilder()
                .setName('rutbebak')
                .setDescription('Kullanıcının Roblox rütbesini gösterir.')
                .addStringOption(opt => opt.setName('roblox_adi').setDescription('Roblox kullanıcı adı').setRequired(true)),

            new SlashCommandBuilder()
                .setName('rutbelist')
                .setDescription('Tüm rütbe listesini gösterir.'),

            // === BİLGİ KOMUTLARI ===
            new SlashCommandBuilder()
                .setName('kullanici')
                .setDescription('Kullanıcı hakkında bilgi gösterir.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Bilgi alınacak kişi').setRequired(false)),

            new SlashCommandBuilder()
                .setName('sunucu')
                .setDescription('Sunucu hakkında bilgi gösterir.'),

            new SlashCommandBuilder()
                .setName('bot')
                .setDescription('Bot hakkında bilgi gösterir.'),

            new SlashCommandBuilder()
                .setName('ping')
                .setDescription('Botun gecikme süresini gösterir.'),

            new SlashCommandBuilder()
                .setName('avatar')
                .setDescription('Kullanıcının avatarını gösterir.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Avatar alınacak kişi').setRequired(false)),

            // === DUYURU & MESAJİNG ===
            new SlashCommandBuilder()
                .setName('duyuru')
                .setDescription('Belirtilen kanala embed duyuru gönderir.')
                .addChannelOption(opt => opt.setName('kanal').setDescription('Duyuru kanalı').setRequired(true))
                .addStringOption(opt => opt.setName('baslik').setDescription('Duyuru başlığı').setRequired(true))
                .addStringOption(opt => opt.setName('icerik').setDescription('Duyuru içeriği').setRequired(true))
                .addStringOption(opt => opt.setName('renk').setDescription('Embed rengi (hex, örn: #FF0000)').setRequired(false)),

            new SlashCommandBuilder()
                .setName('dm')
                .setDescription('Kullanıcıya DM gönderir.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('DM gönderilecek kişi').setRequired(true))
                .addStringOption(opt => opt.setName('mesaj').setDescription('Mesaj içeriği').setRequired(true)),

            new SlashCommandBuilder()
                .setName('toplu-dm')
                .setDescription('Belirli role sahip kişilere toplu DM gönderir.')
                .addRoleOption(opt => opt.setName('rol').setDescription('Hedef rol').setRequired(true))
                .addStringOption(opt => opt.setName('mesaj').setDescription('Mesaj içeriği').setRequired(true)),

            // === ROL YÖNETİMİ ===
            new SlashCommandBuilder()
                .setName('rol-ver')
                .setDescription('Kullanıcıya rol verir.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Rol verilecek kişi').setRequired(true))
                .addRoleOption(opt => opt.setName('rol').setDescription('Verilecek rol').setRequired(true)),

            new SlashCommandBuilder()
                .setName('rol-al')
                .setDescription('Kullanıcıdan rol alır.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Rol alınacak kişi').setRequired(true))
                .addRoleOption(opt => opt.setName('rol').setDescription('Alınacak rol').setRequired(true)),

            new SlashCommandBuilder()
                .setName('rol-bilgi')
                .setDescription('Rol hakkında bilgi gösterir.')
                .addRoleOption(opt => opt.setName('rol').setDescription('Bilgi alınacak rol').setRequired(true)),

            // === NİCKNAME ===
            new SlashCommandBuilder()
                .setName('nick')
                .setDescription('Kullanıcının sunucu nickini değiştirir.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Nick değiştirilecek kişi').setRequired(true))
                .addStringOption(opt => opt.setName('yeni_nick').setDescription('Yeni nickname (boş = sıfırla)').setRequired(false)),

            // === ANKET ===
            new SlashCommandBuilder()
                .setName('anket')
                .setDescription('Hızlı evet/hayır anketi oluşturur.')
                .addStringOption(opt => opt.setName('soru').setDescription('Anket sorusu').setRequired(true))
                .addChannelOption(opt => opt.setName('kanal').setDescription('Anket kanalı (boş = mevcut)').setRequired(false)),

            // === GELEN KUTUSU / TOPLU İŞLEM ===
            new SlashCommandBuilder()
                .setName('hepsini-ban')
                .setDescription('ID listesindeki tüm kullanıcıları banlar (toplu).')
                .addStringOption(opt => opt.setName('id_listesi').setDescription('Virgülle ayrılmış ID listesi').setRequired(true))
                .addStringOption(opt => opt.setName('sebep').setDescription('Ban sebebi').setRequired(true)),

        ].map(cmd => cmd.toJSON());

        await rest.put(Routes.applicationCommands(config.CLIENT_ID), { body: commands });
        console.log(`[✅] ${commands.length} Discord komutu başarıyla kaydedildi!`);
    } catch (error) {
        console.error('[❌] Komutlar kaydedilirken hata:', error);
    }
})();

// ============================================================
//  READY EVENTİ
// ============================================================
client.once('ready', async () => {
    console.log(`[🤖] ${client.user.tag} olarak giriş yapıldı!`);
    console.log(`[📊] ${client.guilds.cache.size} sunucuda aktif.`);
    console.log(`[📋] ${rankList.length} rütbe yüklendi.`);
    client.user.setActivity('Sentura 🦸 ekoyildiz | /yardim', { type: 4 });

    // Başlangıçta grup rollerini önbelleğe al
    if (ROBLOX_COOKIE) {
        await getGroupRoles();
    } else {
        console.warn('[⚠️] ROBLOX_COOKIE environment variable bulunamadı! Rütbe komutları çalışmaz.');
    }

    // Geçici ban/mute kontrolü - her dakika çalışır
    setInterval(() => checkExpiredPunishments(client), 60000);
});

// ============================================================
//  GEÇİCİ CEZA BİTİŞ KONTROLÜ
// ============================================================
async function checkExpiredPunishments(client) {
    const now = Date.now();

    // Geçici banlar
    for (const [userId, data] of tempbanDatabase.entries()) {
        if (now >= data.expiresAt) {
            tempbanDatabase.delete(userId);
            for (const guild of client.guilds.cache.values()) {
                try {
                    await guild.bans.remove(userId, 'Geçici ban süresi doldu - Otomatik Unban');
                    const user = await client.users.fetch(userId).catch(() => null);
                    if (user) {
                        const embed = buildDMEmbed('unban', guild.name, 'Sistem (Otomatik)', 'Geçici ban süreniz doldu.');
                        await sendDM(user, embed);
                        const logEmbed = buildModEmbed(
                            '✅ Otomatik Unban',
                            '#00FF00',
                            [
                                { name: '👤 Kullanıcı', value: `${user.tag} (${userId})`, inline: true },
                                { name: '📋 Sebep', value: 'Geçici ban süresi doldu', inline: true }
                            ]
                        );
                        await sendLog(client, logEmbed);
                    }
                } catch { /* Zaten sunucuda ban yoksa sessizce geç */ }
            }
        }
    }

    // Geçici muteler
    for (const [userId, data] of tempmuteDatabase.entries()) {
        if (now >= data.expiresAt) {
            tempmuteDatabase.delete(userId);
            for (const guild of client.guilds.cache.values()) {
                try {
                    const member = await guild.members.fetch(userId).catch(() => null);
                    if (!member) continue;
                    const muteRole = guild.roles.cache.get(config.MUTE_ROLE_ID);
                    if (muteRole && member.roles.cache.has(muteRole.id)) {
                        await member.roles.remove(muteRole, 'Geçici mute süresi doldu - Otomatik Unmute');
                        const dmEmbed = buildDMEmbed('unmute', guild.name, 'Sistem (Otomatik)', 'Geçici susturma süreniz doldu.');
                        await sendDM(member.user, dmEmbed);
                        const logEmbed = buildModEmbed(
                            '🔊 Otomatik Unmute',
                            '#00FF00',
                            [
                                { name: '👤 Kullanıcı', value: `${member.user.tag} (${userId})`, inline: true },
                                { name: '📋 Sebep', value: 'Geçici mute süresi doldu', inline: true }
                            ]
                        );
                        await sendLog(client, logEmbed);
                    }
                } catch { /* Üye sunucuda değilse sessizce geç */ }
            }
        }
    }
}

// ============================================================
//  ANA ETKİLEŞİM HANDLER'I
// ============================================================
client.on('interactionCreate', async interaction => {

    // === AUTOCOMPLETE ===
    if (interaction.isAutocomplete()) {
        if (interaction.commandName === 'rutbedegistir') {
            const focusedValue = interaction.options.getFocused();
            const filtered = rankList.filter(r => r.name.toLowerCase().includes(focusedValue.toLowerCase()));
            await interaction.respond(filtered.slice(0, 25).map(r => ({ name: r.name, value: r.id })));
        }
        return;
    }

    // === BUTON ETKİLEŞİMLERİ ===
    if (interaction.isButton()) {
        await handleButtonInteraction(interaction);
        return;
    }

    // Sadece chat input komutları devam etsin
    if (!interaction.isChatInputCommand()) return;

    // Sunucu kontrolü
    if (interaction.guildId !== config.GUILD_ID) {
        return interaction.reply({ content: '❌ Bu komut sadece ana sunucumuzda kullanılabilir.', flags: 64 });
    }

    // Yetki kontrolü
    const hasRole = interaction.member.roles.cache.has(config.REQUIRED_ROLE_ID);
    if (!hasRole) {
        return interaction.reply({ content: '❌ Bu komutu kullanmak için **Yetkili** rolüne sahip olmanız gerekiyor!', flags: 64 });
    }

    const { commandName } = interaction;

    // ============================================================
    //  OYUN YÖNETİMİ KOMUTLARI
    // ============================================================
    if (commandName === 'oyun-yonet') {
        const durum = interaction.options.getBoolean('durum');
        status.isGameOpen = durum;
        const embed = buildModEmbed(
            durum ? '🟢 Oyun Açıldı' : '🔴 Oyun Kapatıldı',
            durum ? '#00FF00' : '#FF0000',
            [
                { name: '🎮 Sistem', value: 'Oyun', inline: true },
                { name: '📊 Durum', value: durum ? '**AÇIK**' : '**KAPALI**', inline: true },
                { name: '👮 İşlemi Yapan', value: interaction.user.tag, inline: true }
            ]
        );
        await interaction.reply({ embeds: [embed] });
        await sendLog(client, embed);
        return;
    }

    if (commandName === 'market-yonet') {
        const durum = interaction.options.getBoolean('durum');
        status.isMarketOpen = durum;
        const embed = buildModEmbed(
            durum ? '🟢 Market Açıldı' : '🔴 Market Kapatıldı',
            durum ? '#00FF00' : '#FF0000',
            [
                { name: '🛒 Sistem', value: 'Rütbe Marketi', inline: true },
                { name: '📊 Durum', value: durum ? '**AÇIK**' : '**KAPALI**', inline: true },
                { name: '👮 İşlemi Yapan', value: interaction.user.tag, inline: true }
            ]
        );
        await interaction.reply({ embeds: [embed] });
        await sendLog(client, embed);
        return;
    }

    if (commandName === 'adaletsarayi-yonet') {
        const durum = interaction.options.getBoolean('durum');
        status.isAdaletSarayOpen = durum;
        const embed = buildModEmbed(
            durum ? '🟢 Adalet Sarayı Açıldı' : '🔴 Adalet Sarayı Kapatıldı',
            durum ? '#00FF00' : '#FF0000',
            [
                { name: '⚖️ Sistem', value: 'Adalet Sarayı', inline: true },
                { name: '📊 Durum', value: durum ? '**AÇIK**' : '**KAPALI**', inline: true },
                { name: '👮 İşlemi Yapan', value: interaction.user.tag, inline: true }
            ]
        );
        await interaction.reply({ embeds: [embed] });
        await sendLog(client, embed);
        return;
    }

    if (commandName === 'tumunu-ac') {
        status.isGameOpen = true;
        status.isMarketOpen = true;
        status.isAdaletSarayOpen = true;
        const embed = buildModEmbed(
            '✅ Tüm Sistemler Açıldı',
            '#00FF00',
            [
                { name: '🎮 Oyun', value: '✅ AÇIK', inline: true },
                { name: '🛒 Market', value: '✅ AÇIK', inline: true },
                { name: '⚖️ Adalet Sarayı', value: '✅ AÇIK', inline: true },
                { name: '👮 İşlemi Yapan', value: interaction.user.tag, inline: false }
            ]
        );
        await interaction.reply({ embeds: [embed] });
        await sendLog(client, embed);
        return;
    }

    if (commandName === 'tumunu-kapat') {
        status.isGameOpen = false;
        status.isMarketOpen = false;
        status.isAdaletSarayOpen = false;
        const embed = buildModEmbed(
            '🚨 Tüm Sistemler Kapatıldı',
            '#FF0000',
            [
                { name: '🎮 Oyun', value: '❌ KAPALI', inline: true },
                { name: '🛒 Market', value: '❌ KAPALI', inline: true },
                { name: '⚖️ Adalet Sarayı', value: '❌ KAPALI', inline: true },
                { name: '👮 İşlemi Yapan', value: interaction.user.tag, inline: false }
            ]
        );
        await interaction.reply({ embeds: [embed] });
        await sendLog(client, embed);
        return;
    }

    if (commandName === 'durum') {
        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('📊 Sistem Durumları')
            .setDescription('Sentura 🦸 ekoyildiz sistematik durum paneli')
            .addFields(
                { name: '🎮 Oyun', value: status.isGameOpen ? '🟢 AÇIK' : '🔴 KAPALI', inline: true },
                { name: '🛒 Rütbe Marketi', value: status.isMarketOpen ? '🟢 AÇIK' : '🔴 KAPALI', inline: true },
                { name: '⚖️ Adalet Sarayı', value: status.isAdaletSarayOpen ? '🟢 AÇIK' : '🔴 KAPALI', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Sentura 🦸 ekoyildiz Sistemleri' });
        await interaction.reply({ embeds: [embed] });
        return;
    }

    // ============================================================
    //  MODERASYON KOMUTLARI
    // ============================================================

    if (commandName === 'ban') {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep');
        const deletedays = parseInt(interaction.options.getString('mesaj_sil') || '0');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (member) {
            if (!member.bannable) {
                return interaction.reply({ content: '❌ Bu kullanıcıyı banlayamam! (Yetkim yetersiz veya üst rol)', flags: 64 });
            }
        }

        const caseId = addModCase('BAN', user.id, interaction.user.id, reason);

        const dmEmbed = buildDMEmbed('ban', interaction.guild.name, interaction.user.tag, reason,
            `Vaka ID: #${caseId}\nSunucu: ${interaction.guild.name}`
        );
        const dmSent = await sendDM(user, dmEmbed);

        try {
            await interaction.guild.bans.create(user.id, { reason: `[#${caseId}] ${reason} | Yetkili: ${interaction.user.tag}`, deleteMessageSeconds: Math.min(Math.max(deletedays, 0), 7) * 86400 });

            const embed = buildModEmbed(
                `🔨 Kullanıcı Banlandı | Vaka #${caseId}`,
                '#FF0000',
                [
                    { name: '👤 Kullanıcı', value: `${user.tag}\n(${user.id})`, inline: true },
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                    { name: '📋 Sebep', value: reason, inline: false },
                    { name: '📩 DM Durumu', value: dmSent ? '✅ Gönderildi' : '❌ Gönderilemedi (DM Kapalı)', inline: true }
                ]
            );
            await interaction.reply({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            await interaction.reply({ content: `❌ Banlama işlemi başarısız: ${error.message}`, flags: 64 });
        }
        return;
    }

    if (commandName === 'tempban') {
        const user = interaction.options.getUser('kullanici');
        const sureStr = interaction.options.getString('sure');
        const reason = interaction.options.getString('sebep');
        const durationMs = parseDuration(sureStr);

        if (!durationMs) {
            return interaction.reply({ content: '❌ Geçersiz süre formatı! Örnek: `10m`, `2h`, `1d`', flags: 64 });
        }

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (member && !member.bannable) {
            return interaction.reply({ content: '❌ Bu kullanıcıyı banlayamam!', flags: 64 });
        }

        const expiresAt = Date.now() + durationMs;
        const durationText = formatDuration(durationMs);
        const caseId = addModCase('TEMPBAN', user.id, interaction.user.id, `${reason} (${durationText})`);
        tempbanDatabase.set(user.id, { expiresAt, reason, moderatorId: interaction.user.id });

        const dmEmbed = buildDMEmbed('tempban', interaction.guild.name, interaction.user.tag, reason,
            `Süre: **${durationText}**\nBitiş: <t:${Math.floor(expiresAt / 1000)}:F>\nVaka ID: #${caseId}`
        );
        const dmSent = await sendDM(user, dmEmbed);

        try {
            await interaction.guild.bans.create(user.id, { reason: `[TEMPBAN #${caseId}] ${reason} | Yetkili: ${interaction.user.tag}`, deleteMessageSeconds: 86400 });

            const embed = buildModEmbed(
                `⏳ Geçici Ban | Vaka #${caseId}`,
                '#CC0000',
                [
                    { name: '👤 Kullanıcı', value: `${user.tag}\n(${user.id})`, inline: true },
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                    { name: '⏱️ Süre', value: durationText, inline: true },
                    { name: '📋 Sebep', value: reason, inline: false },
                    { name: '🕐 Bitiş', value: `<t:${Math.floor(expiresAt / 1000)}:F>`, inline: true },
                    { name: '📩 DM Durumu', value: dmSent ? '✅ Gönderildi' : '❌ Gönderilemedi', inline: true }
                ]
            );
            await interaction.reply({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            tempbanDatabase.delete(user.id);
            await interaction.reply({ content: `❌ Geçici banlama işlemi başarısız: ${error.message}`, flags: 64 });
        }
        return;
    }

    if (commandName === 'unban') {
        const userId = interaction.options.getString('kullanici_id');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';

        try {
            const bannedUser = await interaction.guild.bans.fetch(userId).catch(() => null);
            if (!bannedUser) {
                return interaction.reply({ content: '❌ Bu kullanıcı zaten banlı değil veya ID geçersiz!', flags: 64 });
            }

            await interaction.guild.bans.remove(userId, `${reason} | Yetkili: ${interaction.user.tag}`);
            tempbanDatabase.delete(userId);

            const user = await client.users.fetch(userId).catch(() => null);
            if (user) {
                const dmEmbed = buildDMEmbed('unban', interaction.guild.name, interaction.user.tag, reason);
                await sendDM(user, dmEmbed);
            }

            const caseId = addModCase('UNBAN', userId, interaction.user.id, reason);
            const embed = buildModEmbed(
                `✅ Ban Kaldırıldı | Vaka #${caseId}`,
                '#00FF00',
                [
                    { name: '👤 Kullanıcı', value: user ? `${user.tag}\n(${userId})` : userId, inline: true },
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                    { name: '📋 Sebep', value: reason, inline: false }
                ]
            );
            await interaction.reply({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            await interaction.reply({ content: `❌ Unban işlemi başarısız: ${error.message}`, flags: 64 });
        }
        return;
    }

    if (commandName === 'kick') {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı!', flags: 64 });
        if (!member.kickable) return interaction.reply({ content: '❌ Bu kullanıcıyı atamam! (Yetki yetersiz)', flags: 64 });

        const caseId = addModCase('KICK', user.id, interaction.user.id, reason);

        const dmEmbed = buildDMEmbed('kick', interaction.guild.name, interaction.user.tag, reason,
            `Vaka ID: #${caseId}`
        );
        const dmSent = await sendDM(user, dmEmbed);

        try {
            await member.kick(`[#${caseId}] ${reason} | Yetkili: ${interaction.user.tag}`);

            const embed = buildModEmbed(
                `👢 Kullanıcı Atıldı | Vaka #${caseId}`,
                '#FF6600',
                [
                    { name: '👤 Kullanıcı', value: `${user.tag}\n(${user.id})`, inline: true },
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                    { name: '📋 Sebep', value: reason, inline: false },
                    { name: '📩 DM Durumu', value: dmSent ? '✅ Gönderildi' : '❌ Gönderilemedi', inline: true }
                ]
            );
            await interaction.reply({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            await interaction.reply({ content: `❌ Atma işlemi başarısız: ${error.message}`, flags: 64 });
        }
        return;
    }

    if (commandName === 'mute') {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı!', flags: 64 });

        const muteRole = interaction.guild.roles.cache.get(config.MUTE_ROLE_ID);
        if (!muteRole) return interaction.reply({ content: '❌ Susturulmuş rolü bulunamadı! Config\'i kontrol edin.', flags: 64 });

        if (member.roles.cache.has(muteRole.id)) {
            return interaction.reply({ content: '❌ Bu kullanıcı zaten susturulmuş!', flags: 64 });
        }

        const caseId = addModCase('MUTE', user.id, interaction.user.id, reason);

        const dmEmbed = buildDMEmbed('mute', interaction.guild.name, interaction.user.tag, reason,
            `Vaka ID: #${caseId}`
        );
        const dmSent = await sendDM(user, dmEmbed);

        try {
            await member.roles.add(muteRole, `[#${caseId}] ${reason} | Yetkili: ${interaction.user.tag}`);

            const embed = buildModEmbed(
                `🔇 Kullanıcı Susturuldu | Vaka #${caseId}`,
                '#FFA500',
                [
                    { name: '👤 Kullanıcı', value: `${user.tag}\n(${user.id})`, inline: true },
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                    { name: '📋 Sebep', value: reason, inline: false },
                    { name: '📩 DM Durumu', value: dmSent ? '✅ Gönderildi' : '❌ Gönderilemedi', inline: true }
                ]
            );
            await interaction.reply({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            await interaction.reply({ content: `❌ Susturma işlemi başarısız: ${error.message}`, flags: 64 });
        }
        return;
    }

    if (commandName === 'tempmute') {
        const user = interaction.options.getUser('kullanici');
        const sureStr = interaction.options.getString('sure');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
        const durationMs = parseDuration(sureStr);

        if (!durationMs) {
            return interaction.reply({ content: '❌ Geçersiz süre formatı! Örnek: `10m`, `2h`, `1d`', flags: 64 });
        }

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı!', flags: 64 });

        const muteRole = interaction.guild.roles.cache.get(config.MUTE_ROLE_ID);
        if (!muteRole) return interaction.reply({ content: '❌ Susturulmuş rolü bulunamadı!', flags: 64 });

        const expiresAt = Date.now() + durationMs;
        const durationText = formatDuration(durationMs);
        const caseId = addModCase('TEMPMUTE', user.id, interaction.user.id, `${reason} (${durationText})`);
        tempmuteDatabase.set(user.id, { expiresAt, reason, moderatorId: interaction.user.id });

        const dmEmbed = buildDMEmbed('tempmute', interaction.guild.name, interaction.user.tag, reason,
            `Süre: **${durationText}**\nBitiş: <t:${Math.floor(expiresAt / 1000)}:F>\nVaka ID: #${caseId}`
        );
        const dmSent = await sendDM(user, dmEmbed);

        try {
            await member.roles.add(muteRole, `[TEMPMUTE #${caseId}] ${reason} | Yetkili: ${interaction.user.tag}`);

            const embed = buildModEmbed(
                `⏰ Geçici Susturma | Vaka #${caseId}`,
                '#FF8C00',
                [
                    { name: '👤 Kullanıcı', value: `${user.tag}\n(${user.id})`, inline: true },
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                    { name: '⏱️ Süre', value: durationText, inline: true },
                    { name: '📋 Sebep', value: reason, inline: false },
                    { name: '🕐 Bitiş', value: `<t:${Math.floor(expiresAt / 1000)}:F>`, inline: true },
                    { name: '📩 DM Durumu', value: dmSent ? '✅ Gönderildi' : '❌ Gönderilemedi', inline: true }
                ]
            );
            await interaction.reply({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            tempmuteDatabase.delete(user.id);
            await interaction.reply({ content: `❌ Geçici susturma başarısız: ${error.message}`, flags: 64 });
        }
        return;
    }

    if (commandName === 'unmute') {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı!', flags: 64 });

        const muteRole = interaction.guild.roles.cache.get(config.MUTE_ROLE_ID);
        if (!muteRole) return interaction.reply({ content: '❌ Susturulmuş rolü bulunamadı!', flags: 64 });

        if (!member.roles.cache.has(muteRole.id)) {
            return interaction.reply({ content: '❌ Bu kullanıcı zaten susturulmuş değil!', flags: 64 });
        }

        tempmuteDatabase.delete(user.id);
        const caseId = addModCase('UNMUTE', user.id, interaction.user.id, reason);

        const dmEmbed = buildDMEmbed('unmute', interaction.guild.name, interaction.user.tag, reason,
            `Vaka ID: #${caseId}`
        );
        const dmSent = await sendDM(user, dmEmbed);

        try {
            await member.roles.remove(muteRole, `[#${caseId}] ${reason} | Yetkili: ${interaction.user.tag}`);

            const embed = buildModEmbed(
                `🔊 Susturma Kaldırıldı | Vaka #${caseId}`,
                '#00FF00',
                [
                    { name: '👤 Kullanıcı', value: `${user.tag}\n(${user.id})`, inline: true },
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                    { name: '📋 Sebep', value: reason, inline: false },
                    { name: '📩 DM Durumu', value: dmSent ? '✅ Gönderildi' : '❌ Gönderilemedi', inline: true }
                ]
            );
            await interaction.reply({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            await interaction.reply({ content: `❌ Unmute işlemi başarısız: ${error.message}`, flags: 64 });
        }
        return;
    }

    if (commandName === 'warn') {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı!', flags: 64 });

        const warnCount = addWarning(user.id, reason, interaction.user.id);
        const caseId = addModCase('WARN', user.id, interaction.user.id, reason);

        const dmEmbed = buildDMEmbed('warn', interaction.guild.name, interaction.user.tag, reason,
            `Bu sizin **${warnCount}. uyarınız**.\nVaka ID: #${caseId}`
        );
        const dmSent = await sendDM(user, dmEmbed);

        const embed = buildModEmbed(
            `⚠️ Kullanıcı Uyarıldı | Vaka #${caseId}`,
            '#FFFF00',
            [
                { name: '👤 Kullanıcı', value: `${user.tag}\n(${user.id})`, inline: true },
                { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                { name: '🔢 Toplam Uyarı', value: `${warnCount}`, inline: true },
                { name: '📋 Sebep', value: reason, inline: false },
                { name: '📩 DM Durumu', value: dmSent ? '✅ Gönderildi' : '❌ Gönderilemedi', inline: true }
            ]
        );
        await interaction.reply({ embeds: [embed] });
        await sendLog(client, embed);
        return;
    }

    if (commandName === 'warnlist') {
        const user = interaction.options.getUser('kullanici');
        const warns = getUserWarnings(user.id);

        if (warns.length === 0) {
            return interaction.reply({ content: `✅ **${user.tag}** adlı kullanıcının hiç uyarısı yok.`, flags: 64 });
        }

        const warnFields = warns.slice(0, 25).map((w, i) => ({
            name: `⚠️ Uyarı #${i + 1} — ${new Date(w.timestamp).toLocaleDateString('tr-TR')}`,
            value: `**Sebep:** ${w.reason}\n**Yetkili ID:** ${w.moderatorId}`,
            inline: false
        }));

        const embed = new EmbedBuilder()
            .setColor('#FFFF00')
            .setTitle(`⚠️ Uyarı Listesi — ${user.tag}`)
            .setDescription(`Toplam **${warns.length}** uyarı`)
            .addFields(warnFields)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Sentura 🦸 ekoyildiz' });

        await interaction.reply({ embeds: [embed], flags: 64 });
        return;
    }

    if (commandName === 'warnremove') {
        const user = interaction.options.getUser('kullanici');
        const index = interaction.options.getInteger('index') - 1;
        const warns = getUserWarnings(user.id);

        if (warns.length === 0) {
            return interaction.reply({ content: `❌ **${user.tag}** adlı kullanıcının uyarısı yok.`, flags: 64 });
        }

        if (index < 0 || index >= warns.length) {
            return interaction.reply({ content: `❌ Geçersiz uyarı numarası! (1 ile ${warns.length} arasında olmalı)`, flags: 64 });
        }

        const removedWarn = warns[index];
        removeWarning(user.id, index);

        const embed = buildModEmbed(
            '🗑️ Uyarı Kaldırıldı',
            '#00BFFF',
            [
                { name: '👤 Kullanıcı', value: `${user.tag}`, inline: true },
                { name: '👮 Kaldıran', value: interaction.user.tag, inline: true },
                { name: '📋 Kaldırılan Uyarı', value: removedWarn.reason, inline: false },
                { name: '🔢 Kalan Uyarı', value: `${getUserWarnings(user.id).length}`, inline: true }
            ]
        );
        await interaction.reply({ embeds: [embed] });
        return;
    }

    if (commandName === 'modlog') {
        const user = interaction.options.getUser('kullanici');
        const userCases = [...modlogDatabase.values()].filter(c => c.userId === user.id);

        if (userCases.length === 0) {
            return interaction.reply({ content: `✅ **${user.tag}** adlı kullanıcının moderasyon geçmişi temiz.`, flags: 64 });
        }

        const typeEmoji = { BAN: '🔨', TEMPBAN: '⏳', UNBAN: '✅', KICK: '👢', MUTE: '🔇', TEMPMUTE: '⏰', UNMUTE: '🔊', WARN: '⚠️' };
        const fields = userCases.slice(-10).map(c => ({
            name: `${typeEmoji[c.type] || '📋'} [#${c.caseId}] ${c.type} — ${new Date(c.timestamp).toLocaleDateString('tr-TR')}`,
            value: `**Sebep:** ${c.reason}\n**Yetkili ID:** ${c.moderatorId}`,
            inline: false
        }));

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle(`📋 Moderasyon Geçmişi — ${user.tag}`)
            .setDescription(`Son ${Math.min(userCases.length, 10)} kayıt (toplam: ${userCases.length})`)
            .addFields(fields)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Sentura 🦸 ekoyildiz' });

        await interaction.reply({ embeds: [embed], flags: 64 });
        return;
    }

    if (commandName === 'clear') {
        const sayi = interaction.options.getInteger('sayi');
        const targetUser = interaction.options.getUser('kullanici');

        if (sayi < 1 || sayi > 100) {
            return interaction.reply({ content: '❌ Silinecek mesaj sayısı 1-100 arasında olmalıdır!', flags: 64 });
        }

        await interaction.deferReply({ flags: 64 });

        try {
            let messages = await interaction.channel.messages.fetch({ limit: sayi });
            if (targetUser) {
                messages = messages.filter(m => m.author.id === targetUser.id);
            }
            const deleted = await interaction.channel.bulkDelete(messages, true);
            await interaction.editReply(`✅ **${deleted.size}** mesaj başarıyla silindi.`);

            const logEmbed = buildModEmbed(
                '🗑️ Toplu Mesaj Silme',
                '#FF6600',
                [
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                    { name: '📝 Kanal', value: `<#${interaction.channelId}>`, inline: true },
                    { name: '🔢 Silinen Mesaj', value: `${deleted.size}`, inline: true },
                    { name: '👤 Hedef Kullanıcı', value: targetUser ? targetUser.tag : 'Hepsi', inline: true }
                ]
            );
            await sendLog(client, logEmbed);
        } catch (error) {
            await interaction.editReply(`❌ Mesajlar silinirken hata: ${error.message}`);
        }
        return;
    }

    if (commandName === 'slowmode') {
        const saniye = interaction.options.getInteger('saniye');
        const kanal = interaction.options.getChannel('kanal') || interaction.channel;

        if (saniye < 0 || saniye > 21600) {
            return interaction.reply({ content: '❌ Yavaş mod süresi 0-21600 saniye arasında olmalıdır!', flags: 64 });
        }

        try {
            await kanal.setRateLimitPerUser(saniye, `Slowmode ayarlandı | Yetkili: ${interaction.user.tag}`);
            await interaction.reply({
                content: saniye === 0
                    ? `✅ <#${kanal.id}> kanalında yavaş mod kapatıldı.`
                    : `✅ <#${kanal.id}> kanalında yavaş mod **${saniye} saniye** olarak ayarlandı.`
            });
        } catch (error) {
            await interaction.reply({ content: `❌ Slowmode ayarlanamadı: ${error.message}`, flags: 64 });
        }
        return;
    }

    if (commandName === 'lock') {
        const kanal = interaction.options.getChannel('kanal') || interaction.channel;
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';

        try {
            await kanal.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
            const embed = buildModEmbed(
                '🔒 Kanal Kilitlendi',
                '#FF0000',
                [
                    { name: '📝 Kanal', value: `<#${kanal.id}>`, inline: true },
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                    { name: '📋 Sebep', value: reason, inline: false }
                ]
            );
            await interaction.reply({ embeds: [embed] });
            await kanal.send({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            await interaction.reply({ content: `❌ Kanal kilitlenemedi: ${error.message}`, flags: 64 });
        }
        return;
    }

    if (commandName === 'unlock') {
        const kanal = interaction.options.getChannel('kanal') || interaction.channel;

        try {
            await kanal.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
            const embed = buildModEmbed(
                '🔓 Kanal Kilidi Açıldı',
                '#00FF00',
                [
                    { name: '📝 Kanal', value: `<#${kanal.id}>`, inline: true },
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true }
                ]
            );
            await interaction.reply({ embeds: [embed] });
            await kanal.send({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            await interaction.reply({ content: `❌ Kilit açılamadı: ${error.message}`, flags: 64 });
        }
        return;
    }

    // ============================================================
    //  ROBLOX RÜTBE SİSTEMİ KOMUTLARI
    // ============================================================

    if (commandName === 'terfi' || commandName === 'tenzil' || commandName === 'rutbedegistir') {
        await interaction.deferReply();

        // Cookie kontrolü
        if (!ROBLOX_COOKIE || ROBLOX_COOKIE.length < 50) {
            return interaction.editReply('❌ ROBLOX_COOKIE environment variable ayarlanmamış veya geçersiz! Render\'da kontrol edin.');
        }

        const username = interaction.options.getString('roblox_adi');
        const robloxUser = await getRobloxUser(username);

        if (!robloxUser) {
            return interaction.editReply(`❌ **${username}** adında bir Roblox kullanıcısı bulunamadı.`);
        }

        const currentRankData = await getUserRankInGroup(robloxUser.id);
        if (currentRankData.rank === 0) {
            return interaction.editReply(`❌ **${robloxUser.name}** isimli kullanıcı emniyet grubumuzda bulunmuyor!`);
        }

        const currentIndex = rankList.findIndex(r => r.id === currentRankData.rank);
        let newRankObj;

        try {
            if (commandName === 'terfi') {
                if (currentIndex === -1 || currentIndex >= rankList.length - 1) {
                    return interaction.editReply(`❌ Kullanıcı zaten en yüksek rütbede veya rütbesi sistemde tanımlı değil.`);
                }
                newRankObj = rankList[currentIndex + 1];
            } else if (commandName === 'tenzil') {
                if (currentIndex <= 0) {
                    return interaction.editReply(`❌ Kullanıcı daha fazla rütbe düşürülemez (en alt rütbede).`);
                }
                newRankObj = rankList[currentIndex - 1];
            } else if (commandName === 'rutbedegistir') {
                const requestedId = interaction.options.getInteger('rutbe_id');
                newRankObj = rankList.find(r => r.id === requestedId);
                if (!newRankObj) {
                    return interaction.editReply(`❌ Geçersiz rütbe ID'si seçildi.`);
                }
            }

            const oldRankObj = rankList.find(r => r.id === currentRankData.rank) || { name: currentRankData.name };
            await setRobloxRank(robloxUser.id, newRankObj.id);

            const isTenzil = commandName === 'tenzil' || (commandName === 'rutbedegistir' && newRankObj.id < currentRankData.rank);
            const actionText = commandName === 'terfi' ? 'Terfi' : commandName === 'tenzil' ? 'Tenzil' : 'Rütbe Değişikliği';

            const embed = buildModEmbed(
                `👮 ${actionText} Başarılı`,
                isTenzil ? '#FF0000' : '#00FF00',
                [
                    { name: '👤 Kullanıcı', value: robloxUser.name, inline: true },
                    { name: '📊 Eski Rütbe', value: oldRankObj.name, inline: true },
                    { name: '🆙 Yeni Rütbe', value: newRankObj.name, inline: true },
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                    { name: '🆔 Roblox ID', value: String(robloxUser.id), inline: true }
                ]
            );

            await interaction.editReply({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            await interaction.editReply(`❌ Rütbe değiştirilirken hata oluştu: ${error.message}`);
            console.error('[RÜTBE HATA]', error);
        }
        return;
    }

    if (commandName === 'rutbebak') {
        await interaction.deferReply();

        const username = interaction.options.getString('roblox_adi');
        const robloxUser = await getRobloxUser(username);

        if (!robloxUser) {
            return interaction.editReply(`❌ **${username}** adında bir Roblox kullanıcısı bulunamadı.`);
        }

        const rankData = await getUserRankInGroup(robloxUser.id);

        if (rankData.rank === 0) {
            return interaction.editReply(`❌ **${robloxUser.name}** emniyet grubumuzda bulunmuyor.`);
        }

        const rankObj = rankList.find(r => r.id === rankData.rank);
        const rankIndex = rankList.findIndex(r => r.id === rankData.rank);
        const nextRank = rankIndex !== -1 && rankIndex < rankList.length - 1 ? rankList[rankIndex + 1] : null;

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle(`👮 Rütbe Bilgisi — ${robloxUser.name}`)
            .addFields(
                { name: '🏅 Mevcut Rütbe', value: rankObj ? rankObj.name : rankData.name, inline: true },
                { name: '🔢 Rütbe ID', value: String(rankData.rank), inline: true },
                { name: '📊 Sıralama', value: rankIndex !== -1 ? `${rankIndex + 1}/${rankList.length}` : 'Bilinmiyor', inline: true },
                { name: '⬆️ Sonraki Rütbe', value: nextRank ? nextRank.name : '🏆 En Yüksek Rütbe', inline: true },
                { name: '🆔 Roblox ID', value: String(robloxUser.id), inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Sentura 🦸 ekoyildiz' });

        await interaction.editReply({ embeds: [embed] });
        return;
    }

    if (commandName === 'rutbelist') {
        const chunkSize = 14;
        const embeds = [];

        for (let i = 0; i < rankList.length; i += chunkSize) {
            const chunk = rankList.slice(i, i + chunkSize);
            const embed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle(i === 0 ? '📋 Tüm Rütbe Listesi' : '📋 Rütbe Listesi (devam)')
                .setDescription(chunk.map(r => `\`ID: ${String(r.id).padStart(2)}\` — **${r.name}**`).join('\n'))
                .setFooter({ text: `Sentura 🦸 ekoyildiz | ${rankList.length} rütbe` });
            embeds.push(embed);
        }

        await interaction.reply({ embeds: embeds.slice(0, 10) });
        return;
    }

    // ============================================================
    //  BİLGİ KOMUTLARI
    // ============================================================

    if (commandName === 'kullanici') {
        const target = interaction.options.getUser('kullanici') || interaction.user;
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle(`👤 Kullanıcı Bilgisi — ${target.tag}`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '🆔 Kullanıcı ID', value: target.id, inline: true },
                { name: '📅 Hesap Oluşturma', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:F>`, inline: true },
                { name: '🤖 Bot mu?', value: target.bot ? 'Evet' : 'Hayır', inline: true }
            );

        if (member) {
            embed.addFields(
                { name: '📅 Sunucuya Katılım', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: true },
                { name: '🏷️ Nickname', value: member.nickname || 'Yok', inline: true },
                { name: '🎭 Roller', value: member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => `<@&${r.id}>`).join(', ') || 'Yok', inline: false }
            );
        }

        embed.setTimestamp().setFooter({ text: 'Sentura 🦸 ekoyildiz' });
        await interaction.reply({ embeds: [embed] });
        return;
    }

    if (commandName === 'sunucu') {
        const guild = interaction.guild;
        await guild.members.fetch();
        const botCount = guild.members.cache.filter(m => m.user.bot).size;
        const humanCount = guild.memberCount - botCount;

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle(`🏰 Sunucu Bilgisi — ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '🆔 Sunucu ID', value: guild.id, inline: true },
                { name: '👑 Sahip', value: `<@${guild.ownerId}>`, inline: true },
                { name: '📅 Oluşturulma', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
                { name: '👥 Toplam Üye', value: String(guild.memberCount), inline: true },
                { name: '🧑 Kullanıcı', value: String(humanCount), inline: true },
                { name: '🤖 Bot', value: String(botCount), inline: true },
                { name: '💬 Kanal', value: String(guild.channels.cache.size), inline: true },
                { name: '🎭 Rol', value: String(guild.roles.cache.size), inline: true },
                { name: '🌟 Boost', value: `${guild.premiumSubscriptionCount || 0} (Tier ${guild.premiumTier})`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Sentura 🦸 ekoyildiz' });

        await interaction.reply({ embeds: [embed] });
        return;
    }

    if (commandName === 'bot') {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🤖 Bot Bilgisi')
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🏷️ Bot Adı', value: client.user.tag, inline: true },
                { name: '🆔 Bot ID', value: client.user.id, inline: true },
                { name: '🌐 Sunucu Sayısı', value: String(client.guilds.cache.size), inline: true },
                { name: '⏱️ Uptime', value: `${days}g ${hours}s ${minutes}d ${seconds}sn`, inline: true },
                { name: '📡 Ping', value: `${client.ws.ping}ms`, inline: true },
                { name: '💾 Bellek', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
                { name: '📦 Node.js', value: process.version, inline: true },
                { name: '📚 discord.js', value: require('discord.js').version, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Sentura 🦸 ekoyildiz Sistemleri' });

        await interaction.reply({ embeds: [embed] });
        return;
    }

    if (commandName === 'ping') {
        const sent = await interaction.reply({ content: '📡 Ölçülüyor...', fetchReply: true });
        const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;

        const embed = new EmbedBuilder()
            .setColor(client.ws.ping < 100 ? '#00FF00' : client.ws.ping < 200 ? '#FFFF00' : '#FF0000')
            .setTitle('📡 Gecikme Sonuçları')
            .addFields(
                { name: '💓 API Ping (WebSocket)', value: `${client.ws.ping}ms`, inline: true },
                { name: '🔄 Roundtrip', value: `${roundtrip}ms`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Sentura 🦸 ekoyildiz' });

        await interaction.editReply({ content: null, embeds: [embed] });
        return;
    }

    if (commandName === 'avatar') {
        const target = interaction.options.getUser('kullanici') || interaction.user;

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle(`🖼️ Avatar — ${target.tag}`)
            .setImage(target.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setDescription(`[PNG](${target.displayAvatarURL({ format: 'png', size: 1024 })}) | [JPG](${target.displayAvatarURL({ format: 'jpg', size: 1024 })}) | [WEBP](${target.displayAvatarURL({ format: 'webp', size: 1024 })})`)
            .setTimestamp()
            .setFooter({ text: 'Sentura 🦸 ekoyildiz' });

        await interaction.reply({ embeds: [embed] });
        return;
    }

    // ============================================================
    //  DUYURU & MESAJLAMA KOMUTLARI
    // ============================================================

    if (commandName === 'duyuru') {
        const kanal = interaction.options.getChannel('kanal');
        const baslik = interaction.options.getString('baslik');
        const icerik = interaction.options.getString('icerik');
        const renkStr = interaction.options.getString('renk') || '#0099FF';

        let renk;
        try {
            renk = renkStr.startsWith('#') ? renkStr : `#${renkStr}`;
        } catch {
            renk = '#0099FF';
        }

        const embed = new EmbedBuilder()
            .setColor(renk)
            .setTitle(`📢 ${baslik}`)
            .setDescription(icerik)
            .setTimestamp()
            .setFooter({ text: `Duyuru | ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() });

        try {
            await kanal.send({ embeds: [embed] });
            await interaction.reply({ content: `✅ Duyuru <#${kanal.id}> kanalına başarıyla gönderildi!`, flags: 64 });
            const logEmbed = buildModEmbed(
                '📢 Duyuru Gönderildi',
                '#0099FF',
                [
                    { name: '👮 Gönderen', value: interaction.user.tag, inline: true },
                    { name: '📝 Kanal', value: `<#${kanal.id}>`, inline: true },
                    { name: '🏷️ Başlık', value: baslik, inline: false }
                ]
            );
            await sendLog(client, logEmbed);
        } catch (error) {
            await interaction.reply({ content: `❌ Duyuru gönderilemedi: ${error.message}`, flags: 64 });
        }
        return;
    }

    if (commandName === 'dm') {
        const user = interaction.options.getUser('kullanici');
        const mesaj = interaction.options.getString('mesaj');

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('📩 Yetkili Mesajı')
            .setDescription(mesaj)
            .addFields({ name: '👮 Gönderen Yetkili', value: interaction.user.tag, inline: true })
            .setTimestamp()
            .setFooter({ text: 'Sentura 🦸 ekoyildiz' });

        const sent = await sendDM(user, embed);
        if (sent) {
            await interaction.reply({ content: `✅ **${user.tag}** kullanıcısına DM başarıyla gönderildi.`, flags: 64 });
        } else {
            await interaction.reply({ content: `❌ **${user.tag}** kullanıcısına DM gönderilemedi (DM kapalı olabilir).`, flags: 64 });
        }
        return;
    }

    if (commandName === 'toplu-dm') {
        const rol = interaction.options.getRole('rol');
        const mesaj = interaction.options.getString('mesaj');

        await interaction.deferReply({ flags: 64 });
        await interaction.guild.members.fetch();

        const members = interaction.guild.members.cache.filter(m =>
            m.roles.cache.has(rol.id) && !m.user.bot
        );

        if (members.size === 0) {
            return interaction.editReply(`❌ **${rol.name}** rolüne sahip kullanıcı bulunamadı.`);
        }

        let success = 0, fail = 0;

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('📢 Toplu Duyuru')
            .setDescription(mesaj)
            .addFields({ name: '👮 Gönderen', value: interaction.user.tag, inline: true })
            .setTimestamp()
            .setFooter({ text: 'Sentura 🦸 ekoyildiz' });

        for (const [, member] of members) {
            const sent = await sendDM(member.user, embed);
            if (sent) success++; else fail++;
            // Rate limit için küçük bekleme
            await new Promise(r => setTimeout(r, 100));
        }

        await interaction.editReply(
            `📊 Toplu DM sonucu:\n✅ Başarılı: **${success}**\n❌ Başarısız: **${fail}**\nToplam: **${members.size}**`
        );
        return;
    }

    // ============================================================
    //  ROL YÖNETİMİ KOMUTLARI
    // ============================================================

    if (commandName === 'rol-ver') {
        const user = interaction.options.getUser('kullanici');
        const rol = interaction.options.getRole('rol');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı!', flags: 64 });
        if (member.roles.cache.has(rol.id)) {
            return interaction.reply({ content: `❌ **${user.tag}** zaten **${rol.name}** rolüne sahip!`, flags: 64 });
        }

        try {
            await member.roles.add(rol, `Rol verildi | Yetkili: ${interaction.user.tag}`);
            const dmEmbed = buildDMEmbed('note', interaction.guild.name, interaction.user.tag, `**${rol.name}** rolü verildi.`);
            await sendDM(user, dmEmbed);
            await interaction.reply(`✅ **${user.tag}** kullanıcısına **${rol.name}** rolü verildi.`);
        } catch (error) {
            await interaction.reply({ content: `❌ Rol verilemedi: ${error.message}`, flags: 64 });
        }
        return;
    }

    if (commandName === 'rol-al') {
        const user = interaction.options.getUser('kullanici');
        const rol = interaction.options.getRole('rol');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı!', flags: 64 });
        if (!member.roles.cache.has(rol.id)) {
            return interaction.reply({ content: `❌ **${user.tag}** zaten **${rol.name}** rolüne sahip değil!`, flags: 64 });
        }

        try {
            await member.roles.remove(rol, `Rol alındı | Yetkili: ${interaction.user.tag}`);
            const dmEmbed = buildDMEmbed('note', interaction.guild.name, interaction.user.tag, `**${rol.name}** rolü alındı.`);
            await sendDM(user, dmEmbed);
            await interaction.reply(`✅ **${user.tag}** kullanıcısından **${rol.name}** rolü alındı.`);
        } catch (error) {
            await interaction.reply({ content: `❌ Rol alınamadı: ${error.message}`, flags: 64 });
        }
        return;
    }

    if (commandName === 'rol-bilgi') {
        const rol = interaction.options.getRole('rol');
        await interaction.guild.members.fetch();
        const memberCount = interaction.guild.members.cache.filter(m => m.roles.cache.has(rol.id)).size;

        const embed = new EmbedBuilder()
            .setColor(rol.color || '#0099FF')
            .setTitle(`🎭 Rol Bilgisi — ${rol.name}`)
            .addFields(
                { name: '🆔 Rol ID', value: rol.id, inline: true },
                { name: '🎨 Renk', value: rol.hexColor, inline: true },
                { name: '👥 Üye Sayısı', value: String(memberCount), inline: true },
                { name: '📊 Pozisyon', value: String(rol.position), inline: true },
                { name: '🔞 Gösterilebilir', value: rol.hoist ? 'Evet' : 'Hayır', inline: true },
                { name: '🏷️ Bahsedilebilir', value: rol.mentionable ? 'Evet' : 'Hayır', inline: true },
                { name: '📅 Oluşturulma', value: `<t:${Math.floor(rol.createdTimestamp / 1000)}:F>`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Sentura 🦸 ekoyildiz' });

        await interaction.reply({ embeds: [embed] });
        return;
    }

    if (commandName === 'nick') {
        const user = interaction.options.getUser('kullanici');
        const yeniNick = interaction.options.getString('yeni_nick') || null;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı!', flags: 64 });

        try {
            await member.setNickname(yeniNick, `Nick değiştirildi | Yetkili: ${interaction.user.tag}`);
            await interaction.reply(`✅ **${user.tag}** kullanıcısının nickname'i **${yeniNick || 'sıfırlandı'}** olarak güncellendi.`);
        } catch (error) {
            await interaction.reply({ content: `❌ Nickname değiştirilemedi: ${error.message}`, flags: 64 });
        }
        return;
    }

    if (commandName === 'anket') {
        const soru = interaction.options.getString('soru');
        const kanal = interaction.options.getChannel('kanal') || interaction.channel;

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📊 Anket')
            .setDescription(`**${soru}**`)
            .addFields(
                { name: '✅ Evet', value: 'Aşağıya oy vermek için butona basın', inline: true },
                { name: '❌ Hayır', value: 'Aşağıya oy vermek için butona basın', inline: true }
            )
            .setFooter({ text: `Anketi açan: ${interaction.user.tag}` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('poll_yes').setLabel('✅ Evet').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('poll_no').setLabel('❌ Hayır').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('poll_results').setLabel('📊 Sonuçlar').setStyle(ButtonStyle.Secondary)
        );

        try {
            await kanal.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: `✅ Anket <#${kanal.id}> kanalına gönderildi!`, flags: 64 });
        } catch (error) {
            await interaction.reply({ content: `❌ Anket gönderilemedi: ${error.message}`, flags: 64 });
        }
        return;
    }

    if (commandName === 'hepsini-ban') {
        const idListStr = interaction.options.getString('id_listesi');
        const reason = interaction.options.getString('sebep');

        const idList = idListStr.split(',').map(id => id.trim()).filter(id => /^\d{17,20}$/.test(id));

        if (idList.length === 0) {
            return interaction.reply({ content: '❌ Geçerli kullanıcı ID\'si bulunamadı! ID\'leri virgülle ayırın.', flags: 64 });
        }

        if (idList.length > 50) {
            return interaction.reply({ content: '❌ Tek seferde en fazla 50 kullanıcı banlanabilir!', flags: 64 });
        }

        await interaction.deferReply();
        let success = 0, fail = 0, alreadyBanned = 0;

        for (const userId of idList) {
            try {
                const alreadyBannedCheck = await interaction.guild.bans.fetch(userId).catch(() => null);
                if (alreadyBannedCheck) { alreadyBanned++; continue; }

                await interaction.guild.bans.create(userId, {
                    reason: `[TOPLU BAN] ${reason} | Yetkili: ${interaction.user.tag}`,
                    deleteMessageSeconds: 86400
                });
                addModCase('BAN', userId, interaction.user.id, `[TOPLU BAN] ${reason}`);

                const user = await client.users.fetch(userId).catch(() => null);
                if (user) {
                    const dmEmbed = buildDMEmbed('ban', interaction.guild.name, interaction.user.tag, reason);
                    await sendDM(user, dmEmbed);
                }
                success++;
            } catch { fail++; }
            await new Promise(r => setTimeout(r, 200));
        }

        const embed = buildModEmbed(
            '🔨 Toplu Ban Tamamlandı',
            '#FF0000',
            [
                { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                { name: '📋 Sebep', value: reason, inline: false },
                { name: '✅ Başarılı', value: String(success), inline: true },
                { name: '❌ Başarısız', value: String(fail), inline: true },
                { name: '⚠️ Zaten Banlı', value: String(alreadyBanned), inline: true },
                { name: '🔢 Toplam', value: String(idList.length), inline: true }
            ]
        );
        await interaction.editReply({ embeds: [embed] });
        await sendLog(client, embed);
        return;
    }

});

// ============================================================
//  BUTON ETKİLEŞİM HANDLER'I
// ============================================================
const pollVotes = new Map(); // messageId -> { yes: Set, no: Set }

async function handleButtonInteraction(interaction) {
    const { customId, message } = interaction;

    if (customId === 'poll_yes' || customId === 'poll_no' || customId === 'poll_results') {
        if (!pollVotes.has(message.id)) {
            pollVotes.set(message.id, { yes: new Set(), no: new Set() });
        }
        const votes = pollVotes.get(message.id);

        if (customId === 'poll_yes') {
            if (votes.yes.has(interaction.user.id)) {
                votes.yes.delete(interaction.user.id);
                return interaction.reply({ content: '✅ Evet oyunuz geri alındı.', flags: 64 });
            }
            votes.no.delete(interaction.user.id);
            votes.yes.add(interaction.user.id);
            return interaction.reply({ content: '✅ Evet oyu kaydedildi!', flags: 64 });
        }

        if (customId === 'poll_no') {
            if (votes.no.has(interaction.user.id)) {
                votes.no.delete(interaction.user.id);
                return interaction.reply({ content: '❌ Hayır oyunuz geri alındı.', flags: 64 });
            }
            votes.yes.delete(interaction.user.id);
            votes.no.add(interaction.user.id);
            return interaction.reply({ content: '❌ Hayır oyu kaydedildi!', flags: 64 });
        }

        if (customId === 'poll_results') {
            const total = votes.yes.size + votes.no.size;
            const yesPercent = total > 0 ? Math.round((votes.yes.size / total) * 100) : 0;
            const noPercent = total > 0 ? Math.round((votes.no.size / total) * 100) : 0;
            const yesBar = '█'.repeat(Math.round(yesPercent / 10)) + '░'.repeat(10 - Math.round(yesPercent / 10));
            const noBar = '█'.repeat(Math.round(noPercent / 10)) + '░'.repeat(10 - Math.round(noPercent / 10));

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle('📊 Anket Sonuçları')
                        .addFields(
                            { name: `✅ Evet — ${votes.yes.size} oy (${yesPercent}%)`, value: `\`${yesBar}\``, inline: false },
                            { name: `❌ Hayır — ${votes.no.size} oy (${noPercent}%)`, value: `\`${noBar}\``, inline: false },
                            { name: '🔢 Toplam Oy', value: String(total), inline: true }
                        )
                        .setTimestamp()
                ],
                flags: 64
            });
        }
    }
}

// ============================================================
//  GuildMemberAdd — Sunucuya katılınca mesaj
// ============================================================
client.on('guildMemberAdd', async member => {
    if (!config.WELCOME_CHANNEL_ID) return;
    try {
        const channel = await client.channels.fetch(config.WELCOME_CHANNEL_ID).catch(() => null);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('👋 Yeni Üye!')
            .setDescription(`**${member.user.tag}** sunucumuza katıldı!\n${member.guild.name} ailesine hoş geldin! 🎉`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🆔 Kullanıcı ID', value: member.user.id, inline: true },
                { name: '📅 Hesap Yaşı', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '👥 Toplam Üye', value: String(member.guild.memberCount), inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Sentura 🦸 ekoyildiz' });

        await channel.send({ embeds: [embed] });
    } catch { /* welcome kanalı yoksa sessizce geç */ }
});

// ============================================================
//  GuildMemberRemove — Sunucudan ayrılınca
// ============================================================
client.on('guildMemberRemove', async member => {
    if (!config.LOG_CHANNEL_ID) return;
    try {
        const embed = new EmbedBuilder()
            .setColor('#FF6600')
            .setTitle('👋 Üye Ayrıldı')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 Kullanıcı', value: `${member.user.tag}\n(${member.user.id})`, inline: true },
                { name: '📅 Katılım', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : 'Bilinmiyor', inline: true },
                { name: '👥 Kalan Üye', value: String(member.guild.memberCount), inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Sentura 🦸 ekoyildiz' });

        await sendLog(client, embed);
    } catch { }
});

// ============================================================
//  HATA YÖNETİMİ
// ============================================================
client.on('error', error => {
    console.error('[❌ CLIENT ERROR]', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[⚠️ UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', error => {
    console.error('[💥 UNCAUGHT EXCEPTION]', error);
});

// ============================================================
//  EKO YILDIZ GELİŞMİŞ ABONE OTOMASYON SİSTEMİ v2.0
//  Hedef Sunucu : 1367646464804655104
//  Hedef Kanal  : 1393374779104432220
//  Abone Rolü   : 1367646745324159127
// ============================================================

const EKO_GUILD_ID      = '1367646464804655104';
const EKO_KANAL_ID      = '1393374779104432220';
const EKO_ROL_ID        = '1367646745324159127';
const EKO_DM_MESAJ      = "Eko Yıldız'a abone oldunuz! Aramıza hoşgeldiniz";

// --- İSTATİSTİK TAKİBİ (in-memory) ---
// { userId: { count, lastPhotoAt, totalPhotos } }
const ekoAbonerDatabase  = new Map();
// Bugün kaç fotoğraf paylaşıldı → { tarih: sayı }
const ekoDailyStats      = new Map();
// Cooldown: bir kişi aynı günde kaç kez DM + rol alabilir → set of userId
const ekoCooldownSet     = new Set();

// ============================================================
//  YARDIMCI: Fotoğraf tespiti (4 farklı yöntemle)
// ============================================================
function ekoFotografVarMi(message) {
    // 1) Attachment — name uzantısı
    const resimUzantilari = ['jpg','jpeg','png','gif','webp','bmp','tiff','svg','avif','heic','heif'];
    if (message.attachments.some(a => {
        const uzanti = (a.name || '').split('.').pop().toLowerCase();
        return resimUzantilari.includes(uzanti);
    })) return true;

    // 2) Attachment — content-type
    if (message.attachments.some(a => a.contentType?.startsWith('image/'))) return true;

    // 3) Embed image / thumbnail
    if (message.embeds.some(e => e.image || e.thumbnail)) return true;

    // 4) URL pattern (Imgur, CDN, vs.)
    const urlRegex = /https?:\/\/\S+\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?[^\s]*)?/i;
    if (urlRegex.test(message.content)) return true;

    return false;
}

// ============================================================
//  YARDIMCI: Günlük istatistik güncelle
// ============================================================
function ekoGuncelleIstatistik(userId) {
    const bugun = new Date().toISOString().slice(0, 10);

    // Günlük global sayaç
    const gunlukSayi = (ekoDailyStats.get(bugun) || 0) + 1;
    ekoDailyStats.set(bugun, gunlukSayi);

    // Kullanıcı bazlı sayaç
    const mevcut = ekoAbonerDatabase.get(userId) || { count: 0, lastPhotoAt: null, totalPhotos: 0 };
    mevcut.totalPhotos += 1;
    mevcut.lastPhotoAt = new Date();
    if (!mevcut.count) mevcut.count = 0;
    ekoAbonerDatabase.set(userId, mevcut);

    return { gunlukSayi, kullaniciFoto: mevcut.totalPhotos };
}

// ============================================================
//  YARDIMCI: Embed oluştur — Abone DM
// ============================================================
function ekoAboneDMEmbed(member, fotoSayi) {
    return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('⭐ Eko Yıldız — Hoşgeldiniz!')
        .setDescription(EKO_DM_MESAJ)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: '📸 Paylaştığınız Fotoğraf', value: `${fotoSayi} adet`, inline: true },
            { name: '📅 Abone Tarihi', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
            { name: '🎭 Kazanılan Rol', value: '⭐ Eko Yıldız Abone', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Eko Yıldız | Sentura 🦸 ekoyildiz', iconURL: 'https://cdn.discordapp.com/embed/avatars/0.png' });
}

// ============================================================
//  YARDIMCI: Embed oluştur — Kanal tebrik mesajı
// ============================================================
function ekoKanalTebrikEmbed(member, fotoSayi, yeniAbone) {
    const renk = yeniAbone ? '#00FF88' : '#FFD700';
    const baslik = yeniAbone
        ? `🎉 Yeni Abone! — ${member.user.username}`
        : `📸 Fotoğraf Paylaşımı — ${member.user.username}`;

    const embed = new EmbedBuilder()
        .setColor(renk)
        .setTitle(baslik)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
        .setTimestamp()
        .setFooter({ text: 'Eko Yıldız Otomasyon | Sentura 🦸 ekoyildiz' });

    if (yeniAbone) {
        embed.setDescription(`**${member.user.toString()}** aramıza katıldı! ⭐`)
             .addFields(
                 { name: '🎭 Verilen Rol', value: `<@&${EKO_ROL_ID}>`, inline: true },
                 { name: '📸 Toplam Fotoğraf', value: `${fotoSayi}`, inline: true },
                 { name: '📩 DM', value: 'Gönderildi', inline: true }
             );
    } else {
        embed.setDescription(`**${member.user.toString()}** yeni bir fotoğraf paylaştı.`)
             .addFields(
                 { name: '📸 Toplam Fotoğrafı', value: `${fotoSayi}`, inline: true }
             );
    }

    return embed;
}

// ============================================================
//  YARDIMCI: Log embed — Log kanalına gönderilir
// ============================================================
function ekoLogEmbed(member, yeniAbone, fotoSayi, dmDurumu) {
    return new EmbedBuilder()
        .setColor(yeniAbone ? '#00FF88' : '#888888')
        .setTitle(yeniAbone ? '⭐ Eko Yıldız — Yeni Abone' : '📸 Eko Yıldız — Fotoğraf')
        .addFields(
            { name: '👤 Kullanıcı', value: `${member.user.tag} (${member.user.id})`, inline: true },
            { name: '🆕 Yeni Abone mi?', value: yeniAbone ? '✅ Evet' : '❌ Hayır (zaten abone)', inline: true },
            { name: '📸 Toplam Fotoğraf', value: `${fotoSayi}`, inline: true },
            { name: '📩 DM Durumu', value: dmDurumu ? '✅ Gönderildi' : '❌ Gönderilemedi (DM kapalı)', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Eko Yıldız Otomasyon Sistemi' });
}

// ============================================================
//  SLASH KOMUT TANIMI — /eko-istatistik
// ============================================================
// Bu komutu commands dizisine eklemek için index.js içindeki
// commands dizisine aşağıdaki tanımı ekleyin:
//
//   new SlashCommandBuilder()
//       .setName('eko-istatistik')
//       .setDescription('Eko Yıldız abone istatistiklerini gösterir.'),
//
//   new SlashCommandBuilder()
//       .setName('eko-sifirla')
//       .setDescription('Bir kullanıcının Eko Yıldız abone verilerini sıfırlar.')
//       .addUserOption(opt => opt.setName('kullanici').setDescription('Sıfırlanacak kişi').setRequired(true)),
//
//   new SlashCommandBuilder()
//       .setName('eko-abone-kontrol')
//       .setDescription('Bir kullanıcının abone durumunu kontrol eder.')
//       .addUserOption(opt => opt.setName('kullanici').setDescription('Kontrol edilecek kişi').setRequired(true)),
//
//   new SlashCommandBuilder()
//       .setName('eko-toplu-rol')
//       .setDescription('Kanalda fotoğraf paylaşmış herkese Eko Yıldız rolü verir (toplu).'),
//
// Bu komutlar zaten kayıt kısmına otomatik eklenir (aşağıda)
// ============================================================

// ============================================================
//  MESSAGE CREATE — Ana Otomasyon
// ============================================================
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.guildId !== EKO_GUILD_ID) return;
    if (message.channelId !== EKO_KANAL_ID) return;
    if (!ekoFotografVarMi(message)) return;

    // --- Üye bilgisini al ---
    let member;
    try {
        const guild = client.guilds.cache.get(EKO_GUILD_ID);
        if (!guild) return;
        member = await guild.members.fetch(message.author.id).catch(() => null);
        if (!member) return;
    } catch {
        return;
    }

    // --- Rol kontrolü ---
    const zatenAbone = member.roles.cache.has(EKO_ROL_ID);

    // --- İstatistik güncelle ---
    const { fotoSayi } = ekoGuncelleIstatistik(message.author.id);
    const istatistik   = ekoAbonerDatabase.get(message.author.id);
    const toplamFoto   = istatistik?.totalPhotos || 1;

    // --- ✅ Tepki ekle ---
    try {
        await message.react('✅');
    } catch (err) {
        console.error('[EKO] Tepki eklenemedi:', err.message);
    }

    // --- Rol ver (sadece yoksa) ---
    let rolVerildi = false;
    if (!zatenAbone) {
        try {
            const rol = member.guild.roles.cache.get(EKO_ROL_ID);
            if (rol) {
                await member.roles.add(rol, 'Eko Yıldız — fotoğraf paylaşımı (otomasyon)');
                rolVerildi = true;
            }
        } catch (err) {
            console.error('[EKO] Rol verilemedi:', err.message);
        }
    }

    // --- DM gönder ---
    // Cooldown: aynı gün aynı kişiye tekrar DM gönderme
    const cooldownKey = `${message.author.id}_${new Date().toISOString().slice(0, 10)}`;
    let dmDurumu = false;

    if (!ekoCooldownSet.has(cooldownKey)) {
        try {
            const dmEmbed = ekoAboneDMEmbed(member, toplamFoto);
            await message.author.send({ embeds: [dmEmbed] });
            dmDurumu = true;
            ekoCooldownSet.add(cooldownKey);
            // Cooldown 24 saat sonra otomatik temizle
            setTimeout(() => ekoCooldownSet.delete(cooldownKey), 24 * 60 * 60 * 1000);
        } catch {
            // DM kapalı — sessizce geç
        }
    }

    // --- Kanal içi tebrik mesajı (sadece yeni abonelere) ---
    if (rolVerildi) {
        try {
            const tebrikEmbed = ekoKanalTebrikEmbed(member, toplamFoto, true);
            const tebrikMesaj = await message.channel.send({ embeds: [tebrikEmbed] });
            // 15 saniye sonra tebrik mesajını sil (kanalı kirletmemek için)
            setTimeout(() => tebrikMesaj.delete().catch(() => {}), 15000);
        } catch (err) {
            console.error('[EKO] Tebrik mesajı gönderilemedi:', err.message);
        }
    }

    // --- Log kanalına gönder ---
    try {
        const logEmbed = ekoLogEmbed(member, rolVerildi, toplamFoto, dmDurumu);
        await sendLog(client, logEmbed);
    } catch (err) {
        console.error('[EKO] Log gönderilemedi:', err.message);
    }

    console.log(`[⭐ EKO] ${message.author.tag} fotoğraf paylaştı | Yeni abone: ${rolVerildi} | Fotoğraf: ${toplamFoto}`);
});

// ============================================================
//  SLASH KOMUTLARI — Eko Yıldız Yönetim Komutları
// ============================================================
client.on('interactionCreate', async ekoInteraction => {
    if (!ekoInteraction.isChatInputCommand()) return;
    if (ekoInteraction.guildId !== EKO_GUILD_ID) return;

    // Sadece Eko komutlarını handle et, diğerlerini ana handler'a bırak
    const ekoKomutlar = ['eko-istatistik', 'eko-sifirla', 'eko-abone-kontrol', 'eko-toplu-rol'];
    if (!ekoKomutlar.includes(ekoInteraction.commandName)) return;

    // Yetki kontrolü (ana sistemle aynı)
    const hasRole = ekoInteraction.member.roles.cache.has(config.REQUIRED_ROLE_ID);
    if (!hasRole) {
        return ekoInteraction.reply({ content: '❌ Bu komutu kullanmak için **Yetkili** rolüne sahip olmanız gerekiyor!', flags: 64 });
    }

    // --- /eko-istatistik ---
    if (ekoInteraction.commandName === 'eko-istatistik') {
        const bugun        = new Date().toISOString().slice(0, 10);
        const gunlukFoto   = ekoDailyStats.get(bugun) || 0;
        const toplamAbone  = ekoAbonerDatabase.size;
        const toplamFoto   = [...ekoAbonerDatabase.values()].reduce((t, u) => t + (u.totalPhotos || 0), 0);

        // Rolü olan kişi sayısı (gerçek zamanlı)
        let rolUyeSayisi = 0;
        try {
            const guild = client.guilds.cache.get(EKO_GUILD_ID);
            if (guild) {
                await guild.members.fetch();
                rolUyeSayisi = guild.members.cache.filter(m => m.roles.cache.has(EKO_ROL_ID)).size;
            }
        } catch {}

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('⭐ Eko Yıldız — İstatistikler')
            .addFields(
                { name: '👥 Toplam Abone (Rol)', value: String(rolUyeSayisi), inline: true },
                { name: '📊 Takip Edilen Kullanıcı', value: String(toplamAbone), inline: true },
                { name: '📸 Toplam Fotoğraf', value: String(toplamFoto), inline: true },
                { name: '📅 Bugünkü Fotoğraf', value: String(gunlukFoto), inline: true },
                { name: '🕐 Cooldown\'daki Kişi', value: String(ekoCooldownSet.size), inline: true },
                { name: '📆 Tarih', value: bugun, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Eko Yıldız Otomasyon | Sentura 🦸 ekoyildiz' });

        return ekoInteraction.reply({ embeds: [embed], flags: 64 });
    }

    // --- /eko-sifirla ---
    if (ekoInteraction.commandName === 'eko-sifirla') {
        const hedef = ekoInteraction.options.getUser('kullanici');
        const onceki = ekoAbonerDatabase.get(hedef.id);

        if (!onceki) {
            return ekoInteraction.reply({ content: `❌ **${hedef.tag}** için Eko Yıldız verisi bulunamadı.`, flags: 64 });
        }

        ekoAbonerDatabase.delete(hedef.id);

        // Cooldown'u da temizle
        for (const key of ekoCooldownSet) {
            if (key.startsWith(hedef.id)) ekoCooldownSet.delete(key);
        }

        const embed = new EmbedBuilder()
            .setColor('#FF4444')
            .setTitle('🗑️ Eko Yıldız Verisi Sıfırlandı')
            .addFields(
                { name: '👤 Kullanıcı', value: `${hedef.tag} (${hedef.id})`, inline: true },
                { name: '📸 Önceki Fotoğraf Sayısı', value: String(onceki.totalPhotos || 0), inline: true },
                { name: '👮 İşlemi Yapan', value: ekoInteraction.user.tag, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Eko Yıldız Otomasyon' });

        await ekoInteraction.reply({ embeds: [embed] });
        await sendLog(client, embed);
        return;
    }

    // --- /eko-abone-kontrol ---
    if (ekoInteraction.commandName === 'eko-abone-kontrol') {
        const hedef  = ekoInteraction.options.getUser('kullanici');
        const veri   = ekoAbonerDatabase.get(hedef.id);
        const guild  = client.guilds.cache.get(EKO_GUILD_ID);
        let abone    = false;

        if (guild) {
            const m = await guild.members.fetch(hedef.id).catch(() => null);
            if (m) abone = m.roles.cache.has(EKO_ROL_ID);
        }

        const embed = new EmbedBuilder()
            .setColor(abone ? '#FFD700' : '#888888')
            .setTitle(`⭐ Abone Kontrol — ${hedef.tag}`)
            .setThumbnail(hedef.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🎭 Abone Rolü', value: abone ? '✅ Mevcut' : '❌ Yok', inline: true },
                { name: '📸 Paylaştığı Fotoğraf', value: veri ? String(veri.totalPhotos) : '0', inline: true },
                { name: '📅 Son Paylaşım', value: veri?.lastPhotoAt ? `<t:${Math.floor(new Date(veri.lastPhotoAt).getTime() / 1000)}:R>` : 'Bilinmiyor', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Eko Yıldız Otomasyon' });

        return ekoInteraction.reply({ embeds: [embed], flags: 64 });
    }

    // --- /eko-toplu-rol ---
    if (ekoInteraction.commandName === 'eko-toplu-rol') {
        await ekoInteraction.deferReply({ flags: 64 });

        const guild = client.guilds.cache.get(EKO_GUILD_ID);
        if (!guild) return ekoInteraction.editReply('❌ Sunucu bulunamadı.');

        const rol = guild.roles.cache.get(EKO_ROL_ID);
        if (!rol) return ekoInteraction.editReply('❌ Eko Yıldız rolü bulunamadı.');

        // Kanaldan son 100 mesajı çek ve fotoğraf paylaşanları bul
        const kanal = guild.channels.cache.get(EKO_KANAL_ID);
        if (!kanal) return ekoInteraction.editReply('❌ Eko kanalı bulunamadı.');

        let mesajlar;
        try {
            mesajlar = await kanal.messages.fetch({ limit: 100 });
        } catch {
            return ekoInteraction.editReply('❌ Mesajlar alınamadı.');
        }

        const fotografPaylasanlar = new Set();
        mesajlar.forEach(m => {
            if (!m.author.bot && ekoFotografVarMi(m)) {
                fotografPaylasanlar.add(m.author.id);
            }
        });

        await guild.members.fetch();
        let verildi = 0, atildi = 0, hata = 0;

        for (const userId of fotografPaylasanlar) {
            const m = guild.members.cache.get(userId);
            if (!m) { hata++; continue; }
            if (m.roles.cache.has(EKO_ROL_ID)) { atildi++; continue; }
            try {
                await m.roles.add(rol, 'Eko Yıldız — toplu rol atama');
                verildi++;
                await new Promise(r => setTimeout(r, 150)); // rate limit
            } catch {
                hata++;
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('⭐ Toplu Eko Yıldız Rol Atama Tamamlandı')
            .addFields(
                { name: '✅ Rol Verildi', value: String(verildi), inline: true },
                { name: '⏭️ Zaten Vardı', value: String(atildi), inline: true },
                { name: '❌ Hata', value: String(hata), inline: true },
                { name: '📸 Fotoğraf Paylaşan (son 100 mesaj)', value: String(fotografPaylasanlar.size), inline: true },
                { name: '👮 İşlemi Yapan', value: ekoInteraction.user.tag, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Eko Yıldız Otomasyon' });

        await ekoInteraction.editReply({ embeds: [embed] });
        await sendLog(client, embed);
        return;
    }
});

// ============================================================
//  EKSTRA: Eko Yıldız Komutlarını Otomatik Kayıt Listesine Ekle
// ============================================================
// commands[] dizisine aşağıdakilerin eklendiğinden emin olmak için
// index.js dosyasında commands dizisinin içine şunları ekleyin:
//
//   new SlashCommandBuilder()
//       .setName('eko-istatistik')
//       .setDescription('Eko Yıldız abone istatistiklerini gösterir.'),
//
//   new SlashCommandBuilder()
//       .setName('eko-sifirla')
//       .setDescription('Bir kullanıcının Eko Yıldız abone verilerini sıfırlar.')
//       .addUserOption(opt => opt.setName('kullanici').setDescription('Sıfırlanacak kişi').setRequired(true)),
//
//   new SlashCommandBuilder()
//       .setName('eko-abone-kontrol')
//       .setDescription('Bir kullanıcının abone durumunu kontrol eder.')
//       .addUserOption(opt => opt.setName('kullanici').setDescription('Kontrol edilecek kişi').setRequired(true)),
//
//   new SlashCommandBuilder()
//       .setName('eko-toplu-rol')
//       .setDescription('Son 100 mesajda fotoğraf paylaşmış herkese Eko Yıldız rolü verir.'),
//
// ============================================================
//  EKO YILDIZ — ROBLOX GRUP KAYIT SİSTEMİ
//  Sunucu  : 1367646464804655104
//  Kanal   : 1497713387604545768
//  Roblox Grup ID : 35431216
//  Verilecek Roblox Grup Rolü: Rank 2
//  Cookie  : Mevcut ROBLOX_COOKIE env değişkeni kullanılır
// ============================================================

const KAYIT_GUILD_ID        = '1367646464804655104';
const KAYIT_KANAL_ID        = '1497713387604545768';
const KAYIT_GRUP_ID         = 35431216;
const KAYIT_RANK_ID         = 2;
const KAYIT_DISCORD_ROL_ID  = '1497719909025714346'; // Kayıt sonrası verilecek Discord rolü

// Cooldown — aynı Discord kullanıcısı tekrar tekrar denemesin
// { discordUserId: timestamp }
const kayitCooldown = new Map();
const KAYIT_COOLDOWN_MS = 30 * 1000; // 30 saniye

// ============================================================
//  YARDIMCI: Grup rol cache — KAYIT_GRUP_ID için ayrı cache
// ============================================================
let kayitGrupRolCache = null;

async function kayitGetirGrupRolleri() {
    if (kayitGrupRolCache) return kayitGrupRolCache;
    try {
        const res = await fetch(`https://groups.roblox.com/v1/groups/${KAYIT_GRUP_ID}/roles`, {
            headers: { 'Cookie': `.ROBLOSECURITY=${ROBLOX_COOKIE}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        kayitGrupRolCache = data.roles || [];
        console.log(`[✅ KAYIT] ${KAYIT_GRUP_ID} grubu için ${kayitGrupRolCache.length} rol yüklendi.`);
        return kayitGrupRolCache;
    } catch (err) {
        console.error('[❌ KAYIT] Grup rolleri alınamadı:', err.message);
        return [];
    }
}

async function kayitGetirRoleId(rankNumber) {
    const roller = await kayitGetirGrupRolleri();
    const rol    = roller.find(r => r.rank === rankNumber);
    return rol ? rol.id : null;
}

// ============================================================
//  YARDIMCI: Kullanıcı grupta mı?
// ============================================================
async function kayitGruptaMi(robloxUserId) {
    try {
        const res  = await fetch(`https://groups.roblox.com/v1/users/${robloxUserId}/groups/roles`);
        const data = await res.json();
        if (data?.data) {
            return data.data.some(g => g.group.id === KAYIT_GRUP_ID);
        }
        return false;
    } catch {
        return false;
    }
}

// ============================================================
//  YARDIMCI: Roblox kullanıcı adından ID al
// ============================================================
async function kayitGetirRobloxKullanici(username) {
    try {
        const res  = await fetch('https://users.roblox.com/v1/usernames/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
        });
        const data = await res.json();
        return data?.data?.[0] || null;
    } catch {
        return null;
    }
}

// ============================================================
//  YARDIMCI: Gruba rank ata (mevcut setRobloxRank ile aynı mantık)
// ============================================================
async function kayitAtaRank(robloxUserId) {
    // 1. Rank 2'nin gerçek roleId'sini bul
    const roleId = await kayitGetirRoleId(KAYIT_RANK_ID);
    if (!roleId) throw new Error(`Rank ${KAYIT_RANK_ID} için roleId bulunamadı.`);

    // 2. CSRF token al
    const csrfRes   = await fetch('https://auth.roblox.com/v2/logout', {
        method: 'POST',
        headers: {
            'Cookie': `.ROBLOSECURITY=${ROBLOX_COOKIE}`,
            'Content-Length': '0'
        }
    });
    const csrfToken = csrfRes.headers.get('x-csrf-token');
    if (!csrfToken) throw new Error('CSRF token alınamadı.');

    // 3. Rolü ata
    const patchRes = await fetch(`https://groups.roblox.com/v1/groups/${KAYIT_GRUP_ID}/users/${robloxUserId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type':  'application/json',
            'Cookie':        `.ROBLOSECURITY=${ROBLOX_COOKIE}`,
            'x-csrf-token':  csrfToken
        },
        body: JSON.stringify({ roleId })
    });

    if (!patchRes.ok) {
        const hata = await patchRes.text().catch(() => 'Bilinmeyen hata');
        throw new Error(`Roblox API: ${patchRes.status} — ${hata}`);
    }
    return true;
}

// ============================================================
//  YARDIMCI: Kullanıcının mevcut grubundaki rank bilgisi
// ============================================================
async function kayitGetirMevcutRank(robloxUserId) {
    try {
        const res  = await fetch(`https://groups.roblox.com/v1/users/${robloxUserId}/groups/roles`);
        const data = await res.json();
        if (data?.data) {
            const grup = data.data.find(g => g.group.id === KAYIT_GRUP_ID);
            if (grup) return { rank: grup.role.rank, name: grup.role.name };
        }
        return null;
    } catch {
        return null;
    }
}

// ============================================================
//  YARDIMCI: Embed oluştur — başarılı kayıt
// ============================================================
function kayitBasariliEmbed(robloxUser, mevcutRank, hedefRank, discordUser) {
    return new EmbedBuilder()
        .setColor('#00FF88')
        .setTitle('✅ Kayıt Başarılı!')
        .setDescription(`**${robloxUser.name}** gruba başarıyla kaydedildi.`)
        .addFields(
            { name: '👤 Roblox Kullanıcı', value: `[${robloxUser.name}](https://www.roblox.com/users/${robloxUser.id}/profile)`, inline: true },
            { name: '🆔 Roblox ID', value: String(robloxUser.id), inline: true },
            { name: '📊 Eski Rank', value: mevcutRank ? `${mevcutRank.name} (${mevcutRank.rank})` : 'Bilinmiyor', inline: true },
            { name: '🆙 Yeni Rank', value: `Rank ${hedefRank}`, inline: true },
            { name: '🔗 Grup', value: `[EkoYıldız](https://www.roblox.com/communities/${KAYIT_GRUP_ID})`, inline: true },
            { name: '💬 Discord', value: discordUser.tag, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Eko Yıldız Kayıt Sistemi' });
}

function kayitHataEmbed(baslik, aciklama) {
    return new EmbedBuilder()
        .setColor('#FF4444')
        .setTitle(`❌ ${baslik}`)
        .setDescription(aciklama)
        .setTimestamp()
        .setFooter({ text: 'Eko Yıldız Kayıt Sistemi' });
}

function kayitBilgiEmbed(baslik, aciklama, renk = '#FFA500') {
    return new EmbedBuilder()
        .setColor(renk)
        .setTitle(`ℹ️ ${baslik}`)
        .setDescription(aciklama)
        .setTimestamp()
        .setFooter({ text: 'Eko Yıldız Kayıt Sistemi' });
}

// ============================================================
//  MESSAGE CREATE — Kayıt Kanalı Dinleyicisi
// ============================================================
client.on('messageCreate', async message => {

    // Bot mesajlarını yoksay
    if (message.author.bot) return;

    // Sadece hedef sunucu ve kayıt kanalı
    if (message.guildId  !== KAYIT_GUILD_ID) return;
    if (message.channelId !== KAYIT_KANAL_ID) return;

    const icerik = message.content.trim();

    // Boş veya komut gibi mesajları yoksay
    if (!icerik || icerik.startsWith('/')) return;

    // Roblox kullanıcı adı formatı kontrolü (3-20 karakter, harf/rakam/alt çizgi)
    const kullaniciAdiRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!kullaniciAdiRegex.test(icerik)) {
        const hataMsg = await message.reply({
            embeds: [kayitHataEmbed(
                'Geçersiz Kullanıcı Adı',
                `\`${icerik}\` geçerli bir Roblox kullanıcı adı değil.\n\n📌 Roblox kullanıcı adları **3-20 karakter** arasında olmalı ve sadece **harf, rakam veya alt çizgi (_)** içermelidir.`
            )],
            ephemeral: false
        });
        setTimeout(() => hataMsg.delete().catch(() => {}), 10000);
        await message.delete().catch(() => {});
        return;
    }

    // Cooldown kontrolü
    const sonIstek = kayitCooldown.get(message.author.id);
    if (sonIstek && Date.now() - sonIstek < KAYIT_COOLDOWN_MS) {
        const kalanSaniye = Math.ceil((KAYIT_COOLDOWN_MS - (Date.now() - sonIstek)) / 1000);
        const coolMsg = await message.reply({
            embeds: [kayitBilgiEmbed(
                'Lütfen Bekleyin',
                `Çok hızlı deniyorsunuz! **${kalanSaniye} saniye** sonra tekrar deneyin.`,
                '#FFA500'
            )]
        });
        setTimeout(() => coolMsg.delete().catch(() => {}), 8000);
        await message.delete().catch(() => {});
        return;
    }

    // Cooldown başlat
    kayitCooldown.set(message.author.id, Date.now());
    setTimeout(() => kayitCooldown.delete(message.author.id), KAYIT_COOLDOWN_MS);

    // Mesajı sil (kanalı temiz tut)
    await message.delete().catch(() => {});

    // Yükleniyor mesajı
    const yukleniyor = await message.channel.send({
        embeds: [kayitBilgiEmbed(
            'Kontrol Ediliyor...',
            `⏳ **${icerik}** kullanıcısı Roblox'ta aranıyor, lütfen bekleyin...`,
            '#0099FF'
        )]
    });

    try {
        // 1. Roblox kullanıcısını bul
        const robloxUser = await kayitGetirRobloxKullanici(icerik);
        if (!robloxUser) {
            await yukleniyor.edit({
                embeds: [kayitHataEmbed(
                    'Kullanıcı Bulunamadı',
                    `**${icerik}** adında bir Roblox kullanıcısı bulunamadı.\n\n📌 Kullanıcı adını doğru yazdığınızdan emin olun.`
                )]
            });
            setTimeout(() => yukleniyor.delete().catch(() => {}), 15000);
            return;
        }

        // 2. Grupta mı kontrol et
        await yukleniyor.edit({
            embeds: [kayitBilgiEmbed(
                'Grup Kontrolü...',
                `⏳ **${robloxUser.name}** kullanıcısı EkoYıldız grubunda kontrol ediliyor...`,
                '#0099FF'
            )]
        });

        const gruptaMi = await kayitGruptaMi(robloxUser.id);
        if (!gruptaMi) {
            await yukleniyor.edit({
                embeds: [kayitHataEmbed(
                    'Grupta Değil',
                    `**${robloxUser.name}** kullanıcısı [EkoYıldız](https://www.roblox.com/communities/${KAYIT_GRUP_ID}) grubunda **bulunmuyor**.\n\n📌 Önce gruba katılın, ardından tekrar deneyin.\n🔗 [Gruba Katıl](https://www.roblox.com/communities/${KAYIT_GRUP_ID})`
                )]
            });
            setTimeout(() => yukleniyor.delete().catch(() => {}), 20000);

            // Log kanalına bildir
            const logEmbed = new EmbedBuilder()
                .setColor('#FF4444')
                .setTitle('❌ Kayıt Başarısız — Grupta Değil')
                .addFields(
                    { name: '👤 Roblox', value: `${robloxUser.name} (${robloxUser.id})`, inline: true },
                    { name: '💬 Discord', value: `${message.author.tag} (${message.author.id})`, inline: true },
                    { name: '📋 Sebep', value: 'Grupta üye değil', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Eko Yıldız Kayıt Sistemi' });
            await sendLog(client, logEmbed);
            return;
        }

        // 3. Mevcut rankı al
        const mevcutRank = await kayitGetirMevcutRank(robloxUser.id);

        // 4. Rank 2 veya üstündeyse → Roblox rank ATMA, sadece Discord rolü ver
        if (mevcutRank && mevcutRank.rank >= KAYIT_RANK_ID) {
            // Roblox'ta rank değiştirme — ama Discord rolünü yine ver
            let dRolVerildi = false;
            try {
                const guild  = client.guilds.cache.get(KAYIT_GUILD_ID);
                const member = await guild.members.fetch(message.author.id).catch(() => null);
                const dRol   = guild?.roles.cache.get(KAYIT_DISCORD_ROL_ID);
                if (member && dRol && !member.roles.cache.has(KAYIT_DISCORD_ROL_ID)) {
                    await member.roles.add(dRol, 'Eko Yıldız Kayıt — üst rütbeli doğrulama');
                    dRolVerildi = true;
                }
            } catch {}

            const aciklama = mevcutRank.rank > KAYIT_RANK_ID
                ? `Roblox rütbeniz (Rank ${mevcutRank.rank} — **${mevcutRank.name}**) zaten Rank ${KAYIT_RANK_ID}'den yüksek olduğu için Roblox'ta herhangi bir değişiklik yapılmadı.`
                : `Zaten **${mevcutRank.name}** (Rank ${mevcutRank.rank}) rütbesine sahipsiniz.`;

            await yukleniyor.edit({
                embeds: [new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('⭐ Zaten Kayıtlı')
                    .setDescription(aciklama)
                    .addFields(
                        { name: '👤 Roblox', value: `[${robloxUser.name}](https://www.roblox.com/users/${robloxUser.id}/profile)`, inline: true },
                        { name: '📊 Mevcut Rank', value: `${mevcutRank.name} (${mevcutRank.rank})`, inline: true },
                        { name: '🎭 Discord Rolü', value: dRolVerildi ? `✅ <@&${KAYIT_DISCORD_ROL_ID}> verildi` : '✅ Zaten mevcut', inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Eko Yıldız Kayıt Sistemi' })
                ]
            });
            setTimeout(() => yukleniyor.delete().catch(() => {}), 15000);
            return;
        }

        // 5. Rank ata (sadece rank 2'den düşükse — Guest/rank 1 vb.)
        await yukleniyor.edit({
            embeds: [kayitBilgiEmbed(
                'Rank Atanıyor...',
                `⏳ **${robloxUser.name}** kullanıcısına Rank ${KAYIT_RANK_ID} atanıyor...`,
                '#0099FF'
            )]
        });

        await kayitAtaRank(robloxUser.id);

        // 6. Discord rolü ver
        let discordRolVerildi = false;
        try {
            const guild  = client.guilds.cache.get(KAYIT_GUILD_ID);
            const member = await guild.members.fetch(message.author.id).catch(() => null);
            const dRol   = guild?.roles.cache.get(KAYIT_DISCORD_ROL_ID);

            if (member && dRol) {
                if (!member.roles.cache.has(KAYIT_DISCORD_ROL_ID)) {
                    await member.roles.add(dRol, 'Eko Yıldız Kayıt — Roblox grup doğrulaması');
                }
                discordRolVerildi = true;
            }
        } catch (rolErr) {
            console.error('[❌ KAYIT] Discord rol verilemedi:', rolErr.message);
        }

        // 7. Başarı mesajı
        const basariliEmbed = kayitBasariliEmbed(robloxUser, mevcutRank, KAYIT_RANK_ID, message.author);
        if (discordRolVerildi) {
            basariliEmbed.addFields({ name: '🎭 Discord Rolü', value: `<@&${KAYIT_DISCORD_ROL_ID}> verildi`, inline: true });
        }
        await yukleniyor.edit({ embeds: [basariliEmbed] });
        setTimeout(() => yukleniyor.delete().catch(() => {}), 30000);

        // 8. Log kanalına başarı bildirimi
        const logEmbed = new EmbedBuilder()
            .setColor('#00FF88')
            .setTitle('✅ Eko Yıldız — Başarılı Kayıt')
            .addFields(
                { name: '👤 Roblox', value: `${robloxUser.name} (${robloxUser.id})`, inline: true },
                { name: '💬 Discord', value: `${message.author.tag} (${message.author.id})`, inline: true },
                { name: '📊 Eski Rank', value: mevcutRank ? `${mevcutRank.name} (${mevcutRank.rank})` : 'Bilinmiyor', inline: true },
                { name: '🆙 Yeni Roblox Rank', value: `Rank ${KAYIT_RANK_ID}`, inline: true },
                { name: '🎭 Discord Rolü', value: discordRolVerildi ? `✅ <@&${KAYIT_DISCORD_ROL_ID}>` : '❌ Verilemedi', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Eko Yıldız Kayıt Sistemi' });
        await sendLog(client, logEmbed);

        console.log(`[⭐ KAYIT] ${robloxUser.name} (${robloxUser.id}) → Rank ${KAYIT_RANK_ID} | Discord Rol: ${discordRolVerildi} | ${message.author.tag}`);

    } catch (err) {
        console.error('[❌ KAYIT] Hata:', err.message);
        await yukleniyor.edit({
            embeds: [kayitHataEmbed(
                'Sistem Hatası',
                `Bir hata oluştu: \`${err.message}\`\n\nLütfen bir yetkiliyle iletişime geçin.`
            )]
        });
        setTimeout(() => yukleniyor.delete().catch(() => {}), 20000);
    }
});


// ============================================================
//  KAYIT KANALI — SABİT KARŞILAMA MESAJI
//  Bot başladığında (ve mesaj silinirse) otomatik yazar & sabitleir.
// ============================================================

// Bot'un gönderdiği karşılama mesajının ID'sini hafızada tut
let kayitKarsilamaMesajId = null;

const KAYIT_KARSILAMA_ICERIK = [
    '📌 **Kayıt Nasıl Yapılır?**',
    '',
    '1️⃣  Önce aşağıdaki bağlantıdan gruba katılın:',
    '🔗 https://www.roblox.com/communities/35431216/EkoY-ld-z#!/about',
    '',
    '2️⃣  Gruba katıldıktan sonra **Roblox kullanıcı adınızı** bu kanala yazın.',
    '',
    '3️⃣  Bot sizi otomatik olarak doğrulayacak ve özel rolü verecek! 🎉',
].join('\n');

async function kayitKarsilamaMesajiniGonder(client) {
    try {
        const guild  = await client.guilds.fetch(KAYIT_GUILD_ID).catch(() => null);
        if (!guild) return;
        const kanal  = await guild.channels.fetch(KAYIT_KANAL_ID).catch(() => null);
        if (!kanal)  return;

        // Kanalın son mesajlarını tara — botun daha önce gönderdiği mesaj var mı?
        const mesajlar = await kanal.messages.fetch({ limit: 50 }).catch(() => null);
        if (mesajlar) {
            const mevcutMesaj = mesajlar.find(
                m => m.author.id === client.user.id && m.pinned && m.content === KAYIT_KARSILAMA_ICERIK
            );
            if (mevcutMesaj) {
                // Zaten var, ID'yi hafızaya al
                kayitKarsilamaMesajId = mevcutMesaj.id;
                console.log('[📌 KAYIT] Karşılama mesajı zaten mevcut, izleniyor.');
                return;
            }
        }

        // Yoksa gönder
        const yeniMesaj = await kanal.send(KAYIT_KARSILAMA_ICERIK);
        kayitKarsilamaMesajId = yeniMesaj.id;

        // Sabitle
        await yeniMesaj.pin().catch(() => {});
        console.log('[📌 KAYIT] Karşılama mesajı gönderildi ve sabitlendi.');

        // Discord'un "bu mesaj sabitlendi" sistem bildirimini sil
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

// Mesaj silinirse tekrar gönder
client.on('messageDelete', async deletedMessage => {
    if (!kayitKarsilamaMesajId) return;
    if (deletedMessage.channelId !== KAYIT_KANAL_ID) return;
    if (deletedMessage.id !== kayitKarsilamaMesajId) return;

    console.log('[⚠️ KAYIT] Karşılama mesajı silindi, yeniden gönderiliyor...');
    kayitKarsilamaMesajId = null;
    // 2 saniye bekle sonra yeniden gönder
    setTimeout(() => kayitKarsilamaMesajiniGonder(client), 2000);
});

// ╔══════════════════════════════════════════════════════════════════╗
// ║     EKO YILDIZ — GELİŞMİŞ SELAMLAMA + HOŞGELDİN SİSTEMİ       ║
// ║     Versiyon: 3.0 | Geliştirici: Sentura 🦸 ekoyildiz           ║
// ║     Bu bloğu index.js'inin en altına, client.login'den önce     ║
// ║     yapıştır. Hiçbir şeyi değiştirmene gerek yok.               ║
// ╚══════════════════════════════════════════════════════════════════╝

// ============================================================
//  YOUTUBE & SOSYAL MEDYA LİNKLERİ
// ============================================================
const YOUTUBE_ABONE_LINK = 'https://www.youtube.com/@eko8yildiz';
const YOUTUBE_UYE_LINK   = 'https://www.youtube.com/channel/UCNSZYtuDQYsZYYQVJvErDVw/join';

// ============================================================
//  HOŞGELDİN SİSTEMİ — YAPILANDIRMA
// ============================================================
const HG_GUILD_ID   = config.GUILD_ID;
const HG_KANAL_ID   = config.WELCOME_CHANNEL_ID;
const HG_RENK       = '#FFD700';

// İsteğe bağlı: Yeni üyelere otomatik verilecek Discord rolü
// config.json'a  "MEMBER_ROLE_ID": "ROL_ID_BURAYA"  ekleyebilirsin
const HG_ULER_ROL_ID = config.MEMBER_ROLE_ID || null;

// ============================================================
//  SELAMLAMA SİSTEMİ — YAPILANDIRMA
// ============================================================
const SELAMLAMA_COOLDOWN_MS    = 6000;   // Aynı kişi/kanal cooldown (ms)
const SELAMLAMA_KANALLAR_HEPSI = true;   // true = tüm kanallar, false = sadece belirli kanallar
// SELAMLAMA_KANALLAR_HEPSI false ise buradaki kanal ID'lerinde çalışır:
const SELAMLAMA_KANAL_LISTESI  = [];     // örn: ['123456', '789012']

// ============================================================
//  IN-MEMORY VERİ DEPOLARI
// ============================================================
// Selamlama cooldown: "userId_channelId" → timestamp
const selamlamaCooldown = new Map();

// Hoşgeldin istatistikleri: { toplamKatilan, bugunKatilan, tarih }
let hgIstatistik = { toplamKatilan: 0, bugunKatilan: 0, tarih: new Date().toISOString().slice(0, 10) };

// Kullanıcı ruh halleri: userId → { tip, zaman } (son selamlama)
const kullaniciRuhuHali = new Map();

// ============================================================
//  SELAMLAMA DESENLERI — Genişletilmiş
// ============================================================
const selamlamaDesenleri = [
    // Selam / Merhaba
    {
        regex: /\b(selam|selamlar|hey|heyy|heyyy|heyyyy|merhaba|mrb|slm|sln|sa|slmm|slmlar|selamünaleyküm)\b/i,
        tip: 'selam',
        emoji: '👋'
    },
    // Günaydın
    {
        regex: /\b(günayd[ıi]n|gunaydin|günaydın|gün aydın|gnaydın|g\.a\.?)\b/i,
        tip: 'günaydın',
        emoji: '☀️'
    },
    // Tünaydın
    {
        regex: /\b(tünayd[ıi]n|tunaydın|tünaydın|tn\b)\b/i,
        tip: 'tünaydın',
        emoji: '🌤️'
    },
    // İyi akşamlar
    {
        regex: /\b(iyi ak[sş]amlar?|iyi aksam|iyi akşam)\b/i,
        tip: 'iyi akşamlar',
        emoji: '🌆'
    },
    // İyi geceler
    {
        regex: /\b(iyi geceler?|iyi gece|i\.g\.?)\b/i,
        tip: 'iyi geceler',
        emoji: '🌙'
    },
    // İyi uykular / Tatlı rüyalar
    {
        regex: /\b(iyi uykular?|tatl[ıi] r[üu]yalar?|iyi dinlenmeler?)\b/i,
        tip: 'iyi uykular',
        emoji: '😴'
    },
    // Hayırlı Cumalar
    {
        regex: /\b(hay[ıi]rl[ıi] cumalar?|hayırlı cuma|h\.c\.?)\b/i,
        tip: 'hayırlı cuma',
        emoji: '🕌'
    },
    // Selamun Aleyküm
    {
        regex: /\b(selamun aleyk[üu]m|selamın aleyküm|selamunaleyküm|s\.a\.?|^sa$)\b/i,
        tip: 'selamun aleyküm',
        emoji: '🤝'
    },
    // İyi günler
    {
        regex: /\b(iyi günler?|iyi gunler?|i\.g\.?)\b/i,
        tip: 'iyi günler',
        emoji: '🌟'
    },
    // Nasılsın / Naber
    {
        regex: /\b(nas[ıi]ls[ıi]n|nas[ıi]ls[ıi]n[ıi]z|naber|ne haber|n'aber|nbr|nabers)\b/i,
        tip: 'nasılsın',
        emoji: '😊'
    },
    // Ne yapıyorsun
    {
        regex: /\b(ne yap[ıi]yorsun|ne yap[ıi]yorsunuz|napıyorsun|nap[ıi]yon|n[ae]p[ıi]yorsun)\b/i,
        tip: 'ne yapıyorsun',
        emoji: '🤔'
    },
    // İyi bayramlar
    {
        regex: /\b(iyi bayramlar?|hay[ıi]rl[ıi] bayramlar?|bayram[ıi]n[ıi]z mübarek)\b/i,
        tip: 'iyi bayramlar',
        emoji: '🎉'
    },
    // Hoş geldin (birisi bunu yazarsa)
    {
        regex: /\b(ho[sş] geldin|ho[sş] bulduk|ho[sş] geldiniz)\b/i,
        tip: 'hoş geldin',
        emoji: '🎊'
    },
    // Görüşürüz / Güle güle
    {
        regex: /\b(görü[sş]ürüz|g[oö]r[uü][sş]r[uü]z|güle güle|g\.g\.?|bb|byebye|bye|bby|hoşça kal|ho[sş][cç]a kal)\b/i,
        tip: 'görüşürüz',
        emoji: '👋'
    },
];

// ============================================================
//  CEVAP HAVUZLARI — Her tip için zengin ve samimi cevaplar
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
        (u) => `Günaydın günaydın ${u}! ☀️ Erken kalkmışsın, aferin! Güzel bir gün diliyorum!`,
        (u) => `Günaydın ${u}! 🌄 Umarım bugün her şey istediğin gibi gider!`,
        (u) => `Günaydın ${u} 🍳 Kahvaltını güzel yap, güzel günler güzel başlangıçlara bakar!`,
    ],

    'tünaydın': [
        (u) => `Tünaydın ${u}! 🌤️ Günün nasıl geçiyor?`,
        (u) => `Tünaydın ${u} 😊 Öğleden sonranın keyfini çıkar!`,
        (u) => `Tünaydın ${u}! 🌻 Umarım öğleden sonran verimli ve güzel geçiyor!`,
        (u) => `Tünaydın ${u} ☀️ Gün nasıl gidiyor, yoruldun mu?`,
        (u) => `Tünaydın ${u}! 🫖 Öğleden sonra bir çay içerken bize de uğramış! 😄`,
    ],

    'iyi akşamlar': [
        (u) => `İyi akşamlar ${u}! 🌆 Günün nasıl geçti?`,
        (u) => `İyi akşamlar ${u} 🌇 Huzurlu bir akşam dilerim!`,
        (u) => `İyi akşamlar ${u}! ✨ Keyifli bir akşam geçirmeni dilerim!`,
        (u) => `İyi akşamlar ${u} 🌃 Akşam yemeği güzel geçsin!`,
        (u) => `İyi akşamlar ${u}! 🍽️ Umarım güzel bir gün geçirdindir, dinlen biraz!`,
        (u) => `İyi akşamlar ${u} 🌉 Akşamın hayırlı ve güzel geçsin!`,
    ],

    'iyi geceler': [
        (u) => `İyi geceler ${u}! 🌙 Tatlı rüyalar!`,
        (u) => `İyi geceler ${u} 😴 Dinlendirici bir uyku dilerim!`,
        (u) => `İyi geceler ${u}! 🌟 Güzel rüyalar görmeni dilerim!`,
        (u) => `İyi geceler ${u} 🌙 Yarın güzel bir günle uyanırsın inşallah!`,
        (u) => `İyi geceler ${u}! 💤 Uyku güzel, erken yat erken kalk! 😄`,
        (u) => `İyi geceler ${u} ⭐ Yıldızlı geceler geçir!`,
        (u) => `Geceleri hayırlı olsun ${u}! 🌛 Tatlı rüyalar dilerim!`,
        (u) => `İyi geceler ${u}! 🌜 Dinlendirici bir uyku, güzel bir sabah dilerim!`,
    ],

    'iyi uykular': [
        (u) => `İyi uykular ${u}! 😴🌙 Tatlı rüyalar dilerim!`,
        (u) => `İyi uykular ${u} 💤 Dinlendirici geceler!`,
        (u) => `İyi uykular ${u}! 🌛 Tatlı rüyalar, yarın görüşürüz!`,
        (u) => `Tatlı uykular ${u}! 🧸 Bol bol dinlen, yarın enerjik uyan!`,
        (u) => `İyi uykular ${u} 🌜 Rüyanda güzel şeyler gör!`,
        (u) => `Buyur ${u}, git iyi uyu! 😄🌙 Tatlı rüyalar!`,
    ],

    'hayırlı cuma': [
        (u) => `Hayırlı Cumalar ${u}! 🤲 Cuma gününüz mübarek olsun!`,
        (u) => `Hayırlı Cumalar ${u} 🕌 Allah kabul etsin, hayırlar getirsin!`,
        (u) => `Hayırlı Cumalar ${u}! ✨ Cuma bereketli olsun, duaların kabul olsun!`,
        (u) => `Ve cumamız hayırlı olsun ${u}! 🤲 Mübarek günler dilerim!`,
        (u) => `Hayırlı Cumalar ${u} 🕌 Cuma gününüzü tebrik ederim, hayırlı olsun!`,
    ],

    'selamun aleyküm': [
        (u) => `Ve Aleyküm Selam ${u}! 🤝 Nasılsın, hayırlı işler!`,
        (u) => `Ve Aleyküm Selam ${u} 🌟 Hoşgeldin, ne var ne yok?`,
        (u) => `Ve Aleyküm Selam ${u}! 😊 Allah selamet versin!`,
        (u) => `Ve Aleyküm Selam ve Rahmetullahi ve Berakatühü ${u}! 🤲 Nasılsın?`,
        (u) => `Ve Aleyküm Selam ${u}! ✨ Hayırlı günler dilerim!`,
    ],

    'iyi günler': [
        (u) => `İyi günler ${u}! 🌟 Umarım güzel bir gün geçiriyorsundur!`,
        (u) => `İyi günler ${u} ☀️ Sana da iyi günler!`,
        (u) => `İyi günler ${u}! 😊 Keyifli ve verimli bir gün dilerim!`,
        (u) => `İyi günler ${u} 🌺 Bugünün her anının güzel geçmesini dilerim!`,
    ],

    'nasılsın': [
        (u) => `İyiyim teşekkürler ${u}! 😊 Sen nasılsın?`,
        (u) => `Süperim ${u}, sormana sevindim! 🌟 Ya sen?`,
        (u) => `Harika hissediyorum ${u}! ✨ Bugün nasılsın sen?`,
        (u) => `İyiyim ${u}! 😄 Bot olmanın keyfini çıkarıyorum, sen nasılsın?`,
        (u) => `Mükemmelim ${u} 🚀 Her gün daha iyi oluyorum! Sen nasılsın?`,
        (u) => `İyiyim sağ ol ${u}! 🙏 Umarım sen de iyisindir!`,
    ],

    'ne yapıyorsun': [
        (u) => `Sunucuyu koruyorum ${u}! 🦸 Sen ne yapıyorsun?`,
        (u) => `Herkese yardım etmeye çalışıyorum ${u} 😄 Sen?`,
        (u) => `Discord'u izliyorum ${u}! 👀 Ne soracaksın acaba?`,
        (u) => `Görevimin başındayım ${u}! 💪 Bir şeye yardım etmemi ister misin?`,
        (u) => `Seninle sohbet etmeye hazırlanıyordum ${u}! 🎉`,
    ],

    'iyi bayramlar': [
        (u) => `Bayramın kutlu olsun ${u}! 🎉 Bol şeker, bol neşe dilerim!`,
        (u) => `İyi bayramlar ${u}! 🎊 Bayramın sağlık ve mutlulukla geçsin!`,
        (u) => `Bayramınız mübarek olsun ${u}! 🌟 Sevdiklerinizle güzel vakit geçirin!`,
        (u) => `Hayırlı bayramlar ${u}! 🤲 Bayram coşkunuz bol olsun!`,
    ],

    'hoş geldin': [
        (u) => `Hoş bulduk ${u}! 😊 Aramıza katıldığın için memnunuz!`,
        (u) => `Hoş bulduk ${u} 🎉 Güzel vakit geçirirsin burada!`,
        (u) => `Hoş bulduk ${u}! 🌟 Seni görmek güzel!`,
    ],

    'görüşürüz': [
        (u) => `Görüşürüz ${u}! 👋 İyi günler dilerim!`,
        (u) => `Güle güle ${u}! 😊 Yakında görüşmek üzere!`,
        (u) => `Görüşürüz ${u} 🌟 Kendin iyi bak!`,
        (u) => `Güle güle ${u}! 👋 Umarım kısa sürede dönersin!`,
        (u) => `Bye bye ${u}! ✌️ Güzel günler!`,
        (u) => `Görüşmek üzere ${u}! 🎉 Kendine iyi bak!`,
    ],
};

// ============================================================
//  ÖZEL DURUM ALGILAMA — Ek akıllı yanıtlar
// ============================================================
const ozelDurumlar = [
    {
        regex: /\b(yorgunum|çok yoruldum|yoruldum|bitik|bitiktim)\b/i,
        cevaplar: [
            (u) => `Aww ${u}, biraz dinlen! 😔 Kendin iyi bak, sen değerlisin!`,
            (u) => `Hadi ${u}, bir mola ver! ☕ Çay ya da kahve iç, dinlen biraz.`,
            (u) => `${u} yorulmuşsun, normal! 💪 Biraz dinlenince geçer, kendine dikkat et!`,
        ]
    },
    {
        regex: /\b(mutluyum|çok mutluyum|harikayım|süperim|mükemmelim|harika hissediyorum)\b/i,
        cevaplar: [
            (u) => `Waa, mutlu ${u} mutlu! 🎉 Bu enerjin hiç gitmesin!`,
            (u) => `Süper ${u}! 🌟 Mutluluğun bu sunucuya da yansıyor, iyi ki varsın!`,
            (u) => `${u} mutlu = herkes mutlu! 😄🎊 Enerjin çok güzel!`,
        ]
    },
    {
        regex: /\b(üzgünüm|üzüldüm|kötüyüm|mutsuzum|berbat)\b/i,
        cevaplar: [
            (u) => `Aww ${u} 🥺 Geçer, her şey geçici! Umarım kısa sürede düzelir.`,
            (u) => `${u} üzülme 💙 Yanındayız, iyi günler yakında!`,
            (u) => `Geçmiş olsun ${u} 🤗 Zor anlar geçici, iyi anlar kalıcı!`,
        ]
    },
    {
        regex: /\b(sıkıldım|sıkılıyorum|can s[ıi]k[ıi]c[ıi])\b/i,
        cevaplar: [
            (u) => `${u} sıkılmışsın ha! 😄 Biraz konuşalım mı?`,
            (u) => `Sıkılmışsan ${u}, gel sohbet edelim! 🎉 Ya da YouTube'umuza göz at: ${YOUTUBE_ABONE_LINK}`,
            (u) => `${u} sıkılıyorsa sunucuda bir şeyler keşfet! 🌟 Yoksa bana yaz, sohbet ederiz!`,
        ]
    },
    {
        regex: /\b(teşekkürler?|teşekkür ederim|sağ ol|sağolasın|eyw|eyv)\b/i,
        cevaplar: [
            (u) => `Rica ederim ${u}! 😊 Her zaman buradayım!`,
            (u) => `Ne demek ${u}, her zaman! 🌟`,
            (u) => `Rica ederim ${u}! 🤗 Bir şeye daha ihtiyacın olursa söyle!`,
        ]
    },
];

// ============================================================
//  YARDIMCI FONKSİYON — Rastgele cevap seç
// ============================================================
function rastgeleCevap(havuz, kullaniciAdi) {
    const fn = havuz[Math.floor(Math.random() * havuz.length)];
    return fn(kullaniciAdi);
}

// ============================================================
//  YARDIMCI FONKSİYON — Günlük istatistik sıfırla
// ============================================================
function hgGunlukSifirla() {
    const bugun = new Date().toISOString().slice(0, 10);
    if (hgIstatistik.tarih !== bugun) {
        hgIstatistik.bugunKatilan = 0;
        hgIstatistik.tarih = bugun;
    }
}

// ============================================================
//  YARDIMCI FONKSİYON — Hesap güvenlik seviyesi
// ============================================================
function hesapGuvenligiHesapla(createdTimestamp) {
    const yasiGun = Math.floor((Date.now() - createdTimestamp) / 86400000);
    if (yasiGun < 3)  return { seviye: 'Çok Düşük', emoji: '🔴', renk: '#FF0000', puan: 1 };
    if (yasiGun < 7)  return { seviye: 'Düşük',     emoji: '🟠', renk: '#FF6600', puan: 2 };
    if (yasiGun < 30) return { seviye: 'Orta',       emoji: '🟡', renk: '#FFD700', puan: 3 };
    if (yasiGun < 90) return { seviye: 'İyi',        emoji: '🟢', renk: '#00CC44', puan: 4 };
    return               { seviye: 'Güvenli',         emoji: '✅', renk: '#00FF88', puan: 5 };
}

// ============================================================
//  YARDIMCI FONKSİYON — Sunucuya katılım rozeti
// ============================================================
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

// ============================================================
//  YARDIMCI FONKSİYON — Haftanın günü Türkçe
// ============================================================
function haftaninGunu() {
    const gunler = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    return gunler[new Date().getDay()];
}

// ============================================================
//  YARDIMCI FONKSİYON — Embed rengi sira'ya göre
// ============================================================
function sirayaGoreRenk(sira) {
    if (sira === 1)  return '#FFD700';  // Altın
    if (sira <= 10)  return '#C0C0C0';  // Gümüş
    if (sira <= 50)  return '#CD7F32';  // Bronz
    if (sira <= 100) return '#00BFFF';  // Mavi
    return '#FFD700';                   // Varsayılan altın
}

// ============================================================
//  SELAMLAMA SİSTEMİ — messageCreate Handler
// ============================================================
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.guild)     return; // Sadece sunucu, DM değil

    const icerik = message.content.trim();
    if (!icerik) return;

    // Kanal filtresi
    if (!SELAMLAMA_KANALLAR_HEPSI && !SELAMLAMA_KANAL_LISTESI.includes(message.channelId)) return;

    // Cooldown kontrolü
    const coolKey = `${message.author.id}_${message.channelId}`;
    const sonIstek = selamlamaCooldown.get(coolKey);
    if (sonIstek && Date.now() - sonIstek < SELAMLAMA_COOLDOWN_MS) return;

    const kullaniciAdi = message.member?.displayName || message.author.username;

    // ── Önce özel durumları kontrol et (üzgün, mutlu, yorgun vb.) ──
    for (const { regex, cevaplar } of ozelDurumlar) {
        if (regex.test(icerik)) {
            const cevap = rastgeleCevap(cevaplar, kullaniciAdi);
            selamlamaCooldown.set(coolKey, Date.now());
            setTimeout(() => selamlamaCooldown.delete(coolKey), SELAMLAMA_COOLDOWN_MS);

            // Ruh halini kaydet
            kullaniciRuhuHali.set(message.author.id, { tip: 'ozel', zaman: new Date() });

            try {
                await message.reply(cevap);
            } catch { /* sessizce geç */ }
            return;
        }
    }

    // ── Standart selamlamaları kontrol et ──
    let eslesenDesen = null;
    for (const desen of selamlamaDesenleri) {
        if (desen.regex.test(icerik)) {
            eslesenDesen = desen;
            break;
        }
    }
    if (!eslesenDesen) return;

    // Cooldown başlat
    selamlamaCooldown.set(coolKey, Date.now());
    setTimeout(() => selamlamaCooldown.delete(coolKey), SELAMLAMA_COOLDOWN_MS);

    // Ruh halini kaydet
    kullaniciRuhuHali.set(message.author.id, { tip: eslesenDesen.tip, zaman: new Date() });

    // Cevap üret
    const havuz = cevapHavuzu[eslesenDesen.tip];
    if (!havuz) return;

    const cevap = rastgeleCevap(havuz, kullaniciAdi);

    try {
        // %20 ihtimalle tepki de ekle
        if (Math.random() < 0.2) {
            await message.react(eslesenDesen.emoji).catch(() => {});
        }
        await message.reply(cevap);
    } catch { /* sessizce geç */ }
});

// ============================================================
//  HOŞGELDİN SİSTEMİ — guildMemberAdd Handler (GELİŞMİŞ)
// ============================================================
client.on('guildMemberAdd', async member => {
    if (member.guild.id !== HG_GUILD_ID) return;
    if (!HG_KANAL_ID) return;

    hgGunlukSifirla();
    hgIstatistik.toplamKatilan++;
    hgIstatistik.bugunKatilan++;

    try {
        const guild = member.guild;

        // Üye listesini getir (doğru sıra için)
        await guild.members.fetch().catch(() => {});
        const uyeSirasi  = guild.memberCount;
        const rozet      = katilimRozeti(uyeSirasi);
        const guvenlik   = hesapGuvenligiHesapla(member.user.createdTimestamp);
        const embedRenk  = sirayaGoreRenk(uyeSirasi);

        // Hesap yaşı (gün)
        const hesapYasiGun = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);
        let hesapYasiStr;
        if (hesapYasiGun < 1)        hesapYasiStr = 'Bugün oluşturuldu ⚠️';
        else if (hesapYasiGun < 30)  hesapYasiStr = `${hesapYasiGun} gün`;
        else if (hesapYasiGun < 365) hesapYasiStr = `${Math.floor(hesapYasiGun / 30)} ay`;
        else                          hesapYasiStr = `${Math.floor(hesapYasiGun / 365)} yıl ${Math.floor((hesapYasiGun % 365) / 30)} ay`;

        // Bot mu insan mı?
        const botUyeSayisi   = guild.members.cache.filter(m => m.user.bot).size;
        const insanUyeSayisi = guild.memberCount - botUyeSayisi;

        // Haftanın günü + saat
        const simdi  = new Date();
        const saat   = simdi.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const gun    = haftaninGunu();

        // ── ANA HOŞGELDİN EMBED ──
        const hosgeldinEmbed = new EmbedBuilder()
            .setColor(embedRenk)
            .setAuthor({
                name: `${guild.name} — Yeni Üye Katıldı!`,
                iconURL: guild.iconURL({ dynamic: true, size: 64 }) || undefined,
            })
            .setTitle(`🎉 Hoşgeldin, ${member.user.username}!`)
            .setDescription(
                [
                    `> **${guild.name}** sunucusuna hoşgeldin! 🌟`,
                    `> Kuralları okumayı ve kanalları keşfetmeyi unutma!`,
                    `> \u200b`,
                    `> 📺 **YouTube kanalımıza abone ol, gelişmelerden haberdar ol!**`,
                ].join('\n')
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                // ── Kullanıcı Bilgileri ──
                {
                    name: '👤 Kullanıcı Bilgileri',
                    value: [
                        `> **Kullanıcı:** ${member.user.toString()} — \`${member.user.username}\``,
                        `> **Kullanıcı ID:** \`${member.user.id}\``,
                        `> **Hesap Oluşturma:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:D> (<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>)`,
                        `> **Hesap Yaşı:** ${hesapYasiStr}`,
                    ].join('\n'),
                    inline: false
                },
                // ── Sunucu Bilgileri ──
                {
                    name: '🏰 Sunucu Bilgileri',
                    value: [
                        `> **Giriş Sırası:** ${rozet} — \`${uyeSirasi}. üye\``,
                        `> **İnsan Üye:** \`${insanUyeSayisi}\` | **Bot:** \`${botUyeSayisi}\``,
                        `> **Katılım Günü:** ${gun}, ${saat}`,
                        `> **Bugün Katılan:** \`${hgIstatistik.bugunKatilan}\` üye`,
                    ].join('\n'),
                    inline: false
                },
                // ── Güvenlik ──
                {
                    name: '🔒 Hesap Güvenliği',
                    value: `> **Güvenlik Seviyesi:** ${guvenlik.seviye} ${guvenlik.emoji}`,
                    inline: true
                },
                // ── Rol Bilgisi ──
                {
                    name: '🎭 Verilen Rol',
                    value: HG_ULER_ROL_ID
                        ? `> <@&${HG_ULER_ROL_ID}> rolü verildi ✅`
                        : `> **Member** rolü verildi ✅`,
                    inline: true
                },
                // ── Boş alan ──
                { name: '\u200b', value: '\u200b', inline: false },
                // ── YouTube ──
                {
                    name: '📺 Eko Yıldız YouTube',
                    value: [
                        `> 🔔 **[Abone Ol!](${YOUTUBE_ABONE_LINK})** — Yeni videolar kaçırma!`,
                        `> 💎 **[Üye Ol!](${YOUTUBE_UYE_LINK})** — Özel içeriklere eriş!`,
                    ].join('\n'),
                    inline: false
                },
                // ── Karşılama ──
                {
                    name: '💬 Sunucu Ekibinden',
                    value: [
                        `> Merhabalar, sunucumuza hoşgeldiniz! Sunucumuza katıldığın`,
                        `> için üzerine **Member** rolünü başarıyla verdim! 🎊`,
                        `> Herhangi bir sorun veya sorum için yetkililere başvurabilirsin.`,
                    ].join('\n'),
                    inline: false
                }
            )
            .setImage(
                // Banner resmi (isteğe bağlı — kendin ekleyebilirsin)
                // 'https://i.imgur.com/XXXXX.png'
                null
            )
            .setFooter({
                text: `Eko Yıldız | Sentura 🦸 ekoyildiz • ${guild.memberCount} üye`,
                iconURL: guild.iconURL({ dynamic: true }) || undefined,
            })
            .setTimestamp();

        // null image'ı kaldır
        if (!hosgeldinEmbed.data.image) delete hosgeldinEmbed.data.image;

        // ── BUTONLAR ──
        const butonSatiri = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('🔔 Abone Ol!')
                .setStyle(ButtonStyle.Link)
                .setURL(YOUTUBE_ABONE_LINK),
            new ButtonBuilder()
                .setLabel('💎 Kanal Üyesi Ol!')
                .setStyle(ButtonStyle.Link)
                .setURL(YOUTUBE_UYE_LINK),
            new ButtonBuilder()
                .setLabel(`👥 ${guild.memberCount}. Üye`)
                .setStyle(ButtonStyle.Secondary)
                .setCustomId('hg_uyesirasi')
                .setDisabled(true),
        );

        // ── Kanalı getir ve gönder ──
        const kanal = await client.channels.fetch(HG_KANAL_ID).catch(() => null);
        if (!kanal) return;

        await kanal.send({
            content: `👋 ${member.toString()} sunucumuza katıldı!`,
            embeds: [hosgeldinEmbed],
            components: [butonSatiri],
        });

        // ── Üyeye DM gönder ──
        const dmEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`🌟 ${guild.name} Sunucusuna Hoşgeldin!`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 128 }) || undefined)
            .setDescription(
                [
                    `Merhaba **${member.user.username}**! 🎉`,
                    ``,
                    `**${guild.name}** sunucusuna hoşgeldin!`,
                    `Kuralları okumayı ve kanalları keşfetmeyi unutma.`,
                    ``,
                    `📺 **YouTube Kanalımız:**`,
                    `🔔 [Abone Ol!](${YOUTUBE_ABONE_LINK}) — Yeni videolardan haberdar ol!`,
                    `💎 [Kanal Üyesi Ol!](${YOUTUBE_UYE_LINK}) — Özel içeriklere eriş!`,
                    ``,
                    `Herhangi bir sorun veya sorun için sunucudaki yetkililerle iletişime geçebilirsin.`,
                    ``,
                    `Keyifli vakit geçirmeni dileriz! 🌟`,
                ].join('\n')
            )
            .setFooter({ text: 'Eko Yıldız | Sentura 🦸 ekoyildiz' })
            .setTimestamp();

        const dmButon = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('📺 YouTube Kanalı')
                .setStyle(ButtonStyle.Link)
                .setURL(YOUTUBE_ABONE_LINK),
            new ButtonBuilder()
                .setLabel('💎 Üye Ol')
                .setStyle(ButtonStyle.Link)
                .setURL(YOUTUBE_UYE_LINK),
        );

        try {
            await member.user.send({ embeds: [dmEmbed], components: [dmButon] });
        } catch {
            // DM kapalıysa sessizce geç
        }

        // ── Opsiyonel: Üyeye otomatik rol ver ──
        if (HG_ULER_ROL_ID) {
            try {
                const memberRol = guild.roles.cache.get(HG_ULER_ROL_ID);
                if (memberRol) {
                    await member.roles.add(memberRol, 'Otomatik — Yeni üye rolü').catch(() => {});
                }
            } catch { /* sessizce geç */ }
        }

        // ── Log kanalına bildir ──
        const logHgEmbed = new EmbedBuilder()
            .setColor(guvenlik.renk)
            .setTitle('👋 Yeni Üye Katıldı')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 Kullanıcı', value: `${member.user.tag}\n(${member.user.id})`, inline: true },
                { name: '📊 Sıra', value: `${uyeSirasi}. üye`, inline: true },
                { name: '🔒 Güvenlik', value: `${guvenlik.seviye} ${guvenlik.emoji}`, inline: true },
                { name: '📅 Hesap Yaşı', value: hesapYasiStr, inline: true },
                { name: '📆 Katılım', value: `${gun}, ${saat}`, inline: true },
                { name: '📩 DM', value: 'Gönderildi', inline: true },
            )
            .setTimestamp()
            .setFooter({ text: `Eko Yıldız | Bugün ${hgIstatistik.bugunKatilan}. katılan` });

        if (config.LOG_CHANNEL_ID) {
            try {
                const logKanal = await client.channels.fetch(config.LOG_CHANNEL_ID).catch(() => null);
                if (logKanal) await logKanal.send({ embeds: [logHgEmbed] });
            } catch { /* log kanalı yoksa geç */ }
        }

        console.log(`[👋 HOŞGELDİN] ${member.user.tag} (${member.user.id}) — ${uyeSirasi}. üye | Güvenlik: ${guvenlik.seviye}`);

    } catch (err) {
        console.error('[❌ HOŞGELDİN] Hata:', err.message);
    }
});

// ============================================================
//  HOŞGELDİN — UĞURLAMA SİSTEMİ (Üye ayrıldığında)
// ============================================================
client.on('guildMemberRemove', async member => {
    if (member.guild.id !== HG_GUILD_ID) return;
    if (!HG_KANAL_ID) return;

    try {
        const kanal = await client.channels.fetch(HG_KANAL_ID).catch(() => null);
        if (!kanal) return;

        const kalisSuresi = member.joinedTimestamp
            ? Math.floor((Date.now() - member.joinedTimestamp) / 86400000)
            : null;

        let kalisSuresiStr = 'Bilinmiyor';
        if (kalisSuresi !== null) {
            if (kalisSuresi < 1)         kalisSuresiStr = 'Bugün katıldı';
            else if (kalisSuresi === 1)   kalisSuresiStr = '1 gün';
            else if (kalisSuresi < 30)    kalisSuresiStr = `${kalisSuresi} gün`;
            else if (kalisSuresi < 365)   kalisSuresiStr = `${Math.floor(kalisSuresi / 30)} ay`;
            else                          kalisSuresiStr = `${Math.floor(kalisSuresi / 365)} yıl`;
        }

        const ayrılmaEmbed = new EmbedBuilder()
            .setColor('#FF6600')
            .setAuthor({
                name: `${member.guild.name} — Üye Ayrıldı`,
                iconURL: member.guild.iconURL({ dynamic: true }) || undefined,
            })
            .setTitle(`👋 Güle Güle, ${member.user.username}!`)
            .setDescription(
                [
                    `**${member.user.username}** sunucumuzdan ayrıldı.`,
                    `Umarız yakında tekrar görüşürüz! 💙`,
                ].join('\n')
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
            .addFields(
                { name: '👤 Kullanıcı', value: `${member.user.tag}\n(\`${member.user.id}\`)`, inline: true },
                { name: '⏱️ Kalış Süresi', value: kalisSuresiStr, inline: true },
                { name: '👥 Kalan Üye', value: `${member.guild.memberCount} üye`, inline: true },
            )
            .setFooter({ text: 'Eko Yıldız | Sentura 🦸 ekoyildiz' })
            .setTimestamp();

        await kanal.send({ embeds: [ayrılmaEmbed] });

    } catch (err) {
        console.error('[❌ UĞURLAMA] Hata:', err.message);
    }
});

// ============================================================
//  /hg-istatistik KOMUTU — Hoşgeldin istatistikleri
//  Bu komutu commands[] dizisine eklemeyi unutma:
//
//  new SlashCommandBuilder()
//      .setName('hg-istatistik')
//      .setDescription('Hoşgeldin sisteminin istatistiklerini gösterir.'),
//
//  new SlashCommandBuilder()
//      .setName('selamlama-istatistik')
//      .setDescription('Selamlama sisteminin istatistiklerini gösterir.'),
// ============================================================

client.on('interactionCreate', async hgInteraction => {
    if (!hgInteraction.isChatInputCommand()) return;
    if (!['hg-istatistik', 'selamlama-istatistik'].includes(hgInteraction.commandName)) return;

    const hasRole = hgInteraction.member?.roles?.cache?.has(config.REQUIRED_ROLE_ID);
    if (!hasRole) {
        return hgInteraction.reply({ content: '❌ Bu komutu kullanmak için **Yetkili** rolüne sahip olmanız gerekiyor!', flags: 64 });
    }

    if (hgInteraction.commandName === 'hg-istatistik') {
        hgGunlukSifirla();

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('👋 Hoşgeldin Sistemi — İstatistikler')
            .addFields(
                { name: '👥 Toplam Katılan (Bu Oturum)', value: String(hgIstatistik.toplamKatilan), inline: true },
                { name: '📅 Bugün Katılan', value: String(hgIstatistik.bugunKatilan), inline: true },
                { name: '🏰 Mevcut Üye Sayısı', value: String(hgInteraction.guild.memberCount), inline: true },
                { name: '📺 YouTube Abone Linki', value: `[Abone Ol!](${YOUTUBE_ABONE_LINK})`, inline: true },
                { name: '💎 YouTube Üyelik Linki', value: `[Üye Ol!](${YOUTUBE_UYE_LINK})`, inline: true },
            )
            .setTimestamp()
            .setFooter({ text: 'Eko Yıldız Hoşgeldin Sistemi' });

        return hgInteraction.reply({ embeds: [embed], flags: 64 });
    }

    if (hgInteraction.commandName === 'selamlama-istatistik') {
        const cooldownSayisi = selamlamaCooldown.size;
        const ruhalSayisi    = kullaniciRuhuHali.size;

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('💬 Selamlama Sistemi — İstatistikler')
            .addFields(
                { name: '⏱️ Aktif Cooldown', value: `${cooldownSayisi} kullanıcı`, inline: true },
                { name: '😊 Takip Edilen Ruh Hali', value: `${ruhalSayisi} kullanıcı`, inline: true },
                { name: '📊 Tanımlı Selamlama', value: `${selamlamaDesenleri.length} desen`, inline: true },
                { name: '💬 Özel Durum', value: `${ozelDurumlar.length} durum`, inline: true },
                { name: '⚡ Cooldown Süresi', value: `${SELAMLAMA_COOLDOWN_MS / 1000} saniye`, inline: true },
                { name: '📡 Kapsam', value: SELAMLAMA_KANALLAR_HEPSI ? 'Tüm Kanallar' : `${SELAMLAMA_KANAL_LISTESI.length} Kanal`, inline: true },
            )
            .setTimestamp()
            .setFooter({ text: 'Eko Yıldız Selamlama Sistemi' });

        return hgInteraction.reply({ embeds: [embed], flags: 64 });
    }
});

// ============================================================
//  KOMUT KAYIT EKİ — Bu komutları commands[] dizisine ekle:
// ============================================================
//
//   new SlashCommandBuilder()
//       .setName('hg-istatistik')
//       .setDescription('Hoşgeldin sisteminin istatistiklerini gösterir.'),
//
//   new SlashCommandBuilder()
//       .setName('selamlama-istatistik')
//       .setDescription('Selamlama sisteminin istatistiklerini gösterir.'),
//
// ╔══════════════════════════════════════════════════════════════════╗
// ║     EKO YILDIZ — 7/24 SES KANALI SİSTEMİ (RENDER UYUMLU)      ║
// ║     @discordjs/voice KULLANMAZ — Gateway üzerinden çalışır     ║
// ║     Render free tier dahil her platformda çalışır              ║
// ║     Versiyon: 2.0 | Sentura 🦸 ekoyildiz                       ║
// ╚══════════════════════════════════════════════════════════════════╝

// NOT: Bu sistem @discordjs/voice KULLANMAZ.
// Doğrudan Discord Gateway üzerinden ses kanalına bağlanır.
// UDP gerektirmez — Render dahil her platformda çalışır.

// ============================================================
//  YAPILANDIRMA
// ============================================================
const SES_GUILD_ID  = config.GUILD_ID;
const SES_KANAL_ID  = '1393552494180958258';
const SES_YENILE_MS = 30_000;   // 30 saniyede bir kontrol
const SES_BAGLANTI_BEKLEME = 5_000; // Kopunca yeniden bağlanma bekleme

// ============================================================
//  İÇ DURUM
// ============================================================
let sesBagliMi       = false;
let sesBaglanmaZaman = null;
let sesYenileInterval = null;
let sesAktif         = true;
let sesDenemeSayisi  = 0;

// ============================================================
//  YARDIMCI — Gateway üzerinden ses kanalına bağlan
//  discord.js'in internal ws'ini kullanır
// ============================================================
function sesKanalinaBaglan() {
    if (!sesAktif) return;

    try {
        const guild = client.guilds.cache.get(SES_GUILD_ID);
        if (!guild) {
            console.error('[❌ SES] Sunucu bulunamadı:', SES_GUILD_ID);
            return;
        }

        // Discord Gateway'e VOICE_STATE_UPDATE gönder
        guild.shard.send({
            op: 4, // VOICE_STATE_UPDATE opcode
            d: {
                guild_id:   SES_GUILD_ID,
                channel_id: SES_KANAL_ID,
                self_mute:  true,   // Sessiz
                self_deaf:  true,   // Sağır
            }
        });

        sesBagliMi       = true;
        sesBaglanmaZaman = Date.now();
        sesDenemeSayisi  = 0;

        console.log(`[✅ SES] Gateway üzerinden ses kanalına bağlanıldı: <#${SES_KANAL_ID}>`);

    } catch (err) {
        sesBagliMi = false;
        sesDenemeSayisi++;
        console.error('[❌ SES] Bağlantı hatası:', err.message);

        // Yeniden dene
        if (sesAktif) {
            setTimeout(sesKanalinaBaglan, SES_BAGLANTI_BEKLEME);
        }
    }
}

// ============================================================
//  YARDIMCI — Ses kanalından çık
// ============================================================
function sesKanalinadanCik() {
    try {
        const guild = client.guilds.cache.get(SES_GUILD_ID);
        if (!guild) return;

        guild.shard.send({
            op: 4,
            d: {
                guild_id:   SES_GUILD_ID,
                channel_id: null, // null = kanaldan çık
                self_mute:  false,
                self_deaf:  false,
            }
        });

        sesBagliMi = false;
        console.log('[🔴 SES] Ses kanalından çıkıldı.');
    } catch (err) {
        console.error('[❌ SES] Çıkış hatası:', err.message);
    }
}

// ============================================================
//  YARDIMCI — Ses kanalında gerçekten var mı kontrol et
// ============================================================
function sesBaglantiKontrol() {
    if (!sesAktif) return;

    try {
        const guild = client.guilds.cache.get(SES_GUILD_ID);
        if (!guild) return;

        // Botun ses durumunu kontrol et
        const botVoiceState = guild.voiceStates.cache.get(client.user.id);

        if (!botVoiceState || botVoiceState.channelId !== SES_KANAL_ID) {
            console.warn('[⚠️ SES] Bot ses kanalında değil, yeniden bağlanılıyor...');
            sesBagliMi = false;
            sesKanalinaBaglan();
        } else {
            // Bağlı, uptime logla (her 5 dakikada bir)
            if (sesBaglanmaZaman && Date.now() - sesBaglanmaZaman > 0) {
                const uptimeSn = Math.floor((Date.now() - sesBaglanmaZaman) / 1000);
                const d = Math.floor(uptimeSn / 86400);
                const s = Math.floor((uptimeSn % 86400) / 3600);
                const dk = Math.floor((uptimeSn % 3600) / 60);
                // Sadece her 10 dakikada bir logla
                if (uptimeSn % 600 < 30) {
                    console.log(`[🔊 SES] Ses kanalında aktif — Uptime: ${d}g ${s}s ${dk}d`);
                }
            }
        }
    } catch (err) {
        console.error('[❌ SES] Kontrol hatası:', err.message);
    }
}

// ============================================================
//  READY — Bot hazır olunca bağlan
// ============================================================
client.once('ready', () => {
    console.log('[🔊 SES] 7/24 Ses Sistemi başlatılıyor (Render uyumlu)...');

    // 5 saniye bekle, sonra bağlan
    setTimeout(() => {
        sesKanalinaBaglan();

        // Periyodik kontrol başlat
        sesYenileInterval = setInterval(sesBaglantiKontrol, SES_YENILE_MS);
    }, 5000);
});

// ============================================================
//  voiceStateUpdate — Bot atılırsa veya taşınırsa geri dön
// ============================================================
client.on('voiceStateUpdate', (eskiDurum, yeniDurum) => {
    // Sadece botun kendi ses durumunu takip et
    if (eskiDurum.member?.id !== client.user?.id) return;
    if (eskiDurum.guild.id !== SES_GUILD_ID) return;

    // Bot kanaldan çıkarıldıysa
    if (eskiDurum.channelId === SES_KANAL_ID && !yeniDurum.channelId) {
        if (!sesAktif) return;
        console.warn('[⚠️ SES] Bot ses kanalından çıkarıldı! 3sn sonra geri dönülüyor...');
        sesBagliMi = false;
        setTimeout(sesKanalinaBaglan, 3000);
        return;
    }

    // Bot yanlış kanala taşındıysa
    if (yeniDurum.channelId && yeniDurum.channelId !== SES_KANAL_ID) {
        if (!sesAktif) return;
        console.warn('[⚠️ SES] Bot yanlış kanala taşındı! 3sn sonra hedef kanala dönülüyor...');
        sesBagliMi = false;
        setTimeout(sesKanalinaBaglan, 3000);
        return;
    }

    // Bot hedef kanala girdi
    if (yeniDurum.channelId === SES_KANAL_ID) {
        sesBagliMi = true;
        if (!sesBaglanmaZaman) sesBaglanmaZaman = Date.now();
        console.log('[✅ SES] Bot ses kanalında doğrulandı.');
    }
});

// ============================================================
//  shardDisconnect / shardReconnecting — Bağlantı kopunca
// ============================================================
client.on('shardDisconnect', () => {
    sesBagliMi = false;
    console.warn('[⚠️ SES] Shard bağlantısı kesildi, yeniden bağlanmada ses kanalı yenilenecek...');
});

client.on('shardResume', () => {
    console.log('[🔄 SES] Shard yeniden bağlandı, ses kanalı yenileniyor...');
    setTimeout(sesKanalinaBaglan, 3000);
});

// ============================================================
//  KOMUTLAR
//
//  commands[] dizisine şunları ekle:
//
//  new SlashCommandBuilder()
//      .setName('ses-durum')
//      .setDescription('Botun ses kanalı bağlantı durumunu gösterir.'),
//
//  new SlashCommandBuilder()
//      .setName('ses-yenile')
//      .setDescription('Botun ses kanalı bağlantısını yeniler.'),
//
//  new SlashCommandBuilder()
//      .setName('ses-durdur')
//      .setDescription('Botu ses kanalından çıkarır. (Yetkili)'),
//
//  new SlashCommandBuilder()
//      .setName('ses-baslat')
//      .setDescription('Botu ses kanalına yeniden bağlar. (Yetkili)'),
// ============================================================

client.on('interactionCreate', async sesInt => {
    if (!sesInt.isChatInputCommand()) return;

    const sesKomutlar = ['ses-durum', 'ses-yenile', 'ses-durdur', 'ses-baslat'];
    if (!sesKomutlar.includes(sesInt.commandName)) return;

    // /ses-durum — herkese açık
    if (sesInt.commandName === 'ses-durum') {
        const guild = client.guilds.cache.get(SES_GUILD_ID);
        const botVoiceState = guild?.voiceStates.cache.get(client.user.id);
        const gercektenBagli = botVoiceState?.channelId === SES_KANAL_ID;

        let uptimeStr = 'Bilinmiyor';
        if (sesBaglanmaZaman && gercektenBagli) {
            const sn = Math.floor((Date.now() - sesBaglanmaZaman) / 1000);
            const g  = Math.floor(sn / 86400);
            const s  = Math.floor((sn % 86400) / 3600);
            const d  = Math.floor((sn % 3600) / 60);
            const sc = sn % 60;
            uptimeStr = [g > 0 ? `${g}g` : '', s > 0 ? `${s}s` : '', d > 0 ? `${d}d` : '', `${sc}sn`].filter(Boolean).join(' ');
        }

        const embed = new EmbedBuilder()
            .setColor(gercektenBagli ? '#00FF88' : '#FF4444')
            .setTitle(`${gercektenBagli ? '🟢' : '🔴'} 7/24 Ses Kanalı Durumu`)
            .addFields(
                { name: '📡 Bağlantı',      value: gercektenBagli ? '✅ Bağlı' : '❌ Bağlı Değil', inline: true },
                { name: '🎙️ Kanal',         value: `<#${SES_KANAL_ID}>`, inline: true },
                { name: '⏱️ Uptime',        value: uptimeStr, inline: true },
                { name: '🔒 Sistem',        value: sesAktif ? '✅ Aktif' : '⏸️ Durduruldu', inline: true },
                { name: '🔄 Deneme',        value: String(sesDenemeSayisi), inline: true },
                { name: '🌐 Platform',      value: 'Render (Gateway Modu)', inline: true },
            )
            .setTimestamp()
            .setFooter({ text: 'Eko Yıldız | 7/24 Ses Sistemi v2.0 (Render Uyumlu)' });

        return sesInt.reply({ embeds: [embed], flags: 64 });
    }

    // Yetkili kontrolü
    const hasRole = sesInt.member?.roles?.cache?.has(config.REQUIRED_ROLE_ID);
    if (!hasRole) {
        return sesInt.reply({ content: '❌ Bu komutu kullanmak için **Yetkili** rolüne sahip olmanız gerekiyor!', flags: 64 });
    }

    if (sesInt.commandName === 'ses-yenile') {
        sesAktif = true;
        sesKanalinaBaglan();

        const embed = new EmbedBuilder()
            .setColor('#00FF88')
            .setTitle('🔄 Ses Bağlantısı Yenilendi')
            .addFields(
                { name: '🎙️ Kanal',   value: `<#${SES_KANAL_ID}>`, inline: true },
                { name: '👮 Yetkili', value: sesInt.user.tag, inline: true },
            )
            .setTimestamp()
            .setFooter({ text: 'Eko Yıldız | 7/24 Ses Sistemi' });

        return sesInt.reply({ embeds: [embed], flags: 64 });
    }

    if (sesInt.commandName === 'ses-durdur') {
        sesAktif = false;
        sesKanalinadanCik();

        const embed = new EmbedBuilder()
            .setColor('#FF4444')
            .setTitle('⏸️ Ses Sistemi Durduruldu')
            .setDescription('`/ses-baslat` komutuyla yeniden başlatabilirsin.')
            .addFields({ name: '👮 Yetkili', value: sesInt.user.tag, inline: true })
            .setTimestamp()
            .setFooter({ text: 'Eko Yıldız | 7/24 Ses Sistemi' });

        return sesInt.reply({ embeds: [embed] });
    }

    if (sesInt.commandName === 'ses-baslat') {
        sesAktif = true;
        sesDenemeSayisi = 0;
        sesKanalinaBaglan();

        const embed = new EmbedBuilder()
            .setColor('#00FF88')
            .setTitle('▶️ Ses Sistemi Başlatıldı')
            .addFields(
                { name: '🎙️ Kanal',   value: `<#${SES_KANAL_ID}>`, inline: true },
                { name: '👮 Yetkili', value: sesInt.user.tag, inline: true },
            )
            .setTimestamp()
            .setFooter({ text: 'Eko Yıldız | 7/24 Ses Sistemi' });

        return sesInt.reply({ embeds: [embed], flags: 64 });
    }
});

console.log('[🔊 SES] 7/24 Ses Sistemi (Render Uyumlu - Gateway Modu) yüklendi.');

// ============================================================
//  BAŞLATMA
// ============================================================
const PORT = process.env.PORT || config.PORT;
startApi(PORT);
client.login(TOKEN).then(() => {
    setTimeout(() => kayitKarsilamaMesajiniGonder(client), 3000);
});
