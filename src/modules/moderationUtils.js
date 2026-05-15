// ============================================================
//  MODERATION UTILITIES & DATABASES
// ============================================================

// ============================================================
//  IN-MEMORY DATABASES
// ============================================================
const warnDatabase = new Map();
const modlogDatabase = new Map();
const tempbanDatabase = new Map();
const tempmuteDatabase = new Map();
const unbanRequests = new Map();
const pollVotes = new Map();

let caseCounter = 1;

// ============================================================
//  MODLOG FUNCTIONS
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

// ============================================================
//  WARNING SYSTEM
// ============================================================
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

// ============================================================
//  DURATION PARSING
// ============================================================
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
//  PUNISHMENT EXPIRATION CHECK
// ============================================================
async function checkExpiredPunishments(client, config) {
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
                        // Trigger event for logging
                        const logEvent = {
                            type: 'auto_unban',
                            user,
                            guild,
                            reason: 'Geçici ban süreniz doldu.'
                        };
                        client.emit('moderation_log', logEvent);
                    }
                } catch { }
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
                        const logEvent = {
                            type: 'auto_unmute',
                            member,
                            reason: 'Geçici susturma süreniz doldu.'
                        };
                        client.emit('moderation_log', logEvent);
                    }
                } catch { }
            }
        }
    }
}

module.exports = {
    // Databases
    warnDatabase,
    modlogDatabase,
    tempbanDatabase,
    tempmuteDatabase,
    unbanRequests,
    pollVotes,
    
    // Modlog
    addModCase,
    
    // Warnings
    getUserWarnings,
    addWarning,
    removeWarning,
    
    // Duration
    parseDuration,
    formatDuration,
    
    // Punishment
    checkExpiredPunishments,
    
    // Counters
    getCaseCounter: () => caseCounter,
    incrementCaseCounter: () => caseCounter++
};
