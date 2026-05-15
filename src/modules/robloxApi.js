// ============================================================
//  ROBLOX API FUNCTIONS
// ============================================================

const { ROBLOX_COOKIE, ROBLOX_GROUP_ID, rankList, KAYIT_GRUP_ID } = require('./constants');

let groupRolesCache = null;
let kayitGrupRolCache = null;

// ============================================================
//  USER FETCHING
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

async function getUserRankInGroup(userId, groupId = ROBLOX_GROUP_ID) {
    try {
        const response = await fetch(`https://groups.roblox.com/v1/users/${userId}/groups/roles`);
        const data = await response.json();
        if (data && data.data) {
            const group = data.data.find(g => g.group.id === groupId);
            if (group) return { rank: group.role.rank, name: group.role.name };
        }
        return { rank: 0, name: 'Grup Üyesi Değil' };
    } catch {
        return { rank: 0, name: 'API Hatası' };
    }
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
//  RANK SYSTEM - CACHE
// ============================================================
async function getGroupRoles(groupId = ROBLOX_GROUP_ID) {
    // Farklı gruplar için ayrı cache tutalım
    if (groupId === ROBLOX_GROUP_ID && groupRolesCache) return groupRolesCache;
    if (groupId === KAYIT_GRUP_ID && kayitGrupRolCache) return kayitGrupRolCache;

    try {
        const response = await fetch(`https://groups.roblox.com/v1/groups/${groupId}/roles`, {
            headers: {
                'Cookie': `.ROBLOSECURITY=${ROBLOX_COOKIE}`
            }
        });
        if (!response.ok) {
            throw new Error(`Grup rolleri alınamadı: ${response.status}`);
        }
        const data = await response.json();
        
        if (groupId === ROBLOX_GROUP_ID) {
            groupRolesCache = data.roles || [];
            console.log(`[✅] Ana grup için ${groupRolesCache.length} rol yüklendi.`);
            return groupRolesCache;
        } else if (groupId === KAYIT_GRUP_ID) {
            kayitGrupRolCache = data.roles || [];
            console.log(`[✅ KAYIT] Kayıt grubu için ${kayitGrupRolCache.length} rol yüklendi.`);
            return kayitGrupRolCache;
        }
        
        return data.roles || [];
    } catch (err) {
        console.error(`[❌] Grup (${groupId}) rolleri çekilirken hata:`, err.message);
        return [];
    }
}

async function getRoleIdByRank(rankNumber, groupId = ROBLOX_GROUP_ID) {
    const roles = await getGroupRoles(groupId);
    const role = roles.find(r => r.rank === rankNumber);
    return role ? role.id : null;
}

// ============================================================
//  CSRF TOKEN
// ============================================================
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

// ============================================================
//  SET RANK
// ============================================================
async function setRobloxRank(userId, rankNumber, groupId = ROBLOX_GROUP_ID) {
    const roleId = await getRoleIdByRank(rankNumber, groupId);
    if (!roleId) {
        throw new Error(`Rank ${rankNumber} için role ID bulunamadı. Grup rolleri cache'ini kontrol edin.`);
    }

    const csrfToken = await getCsrfToken();

    const response = await fetch(`https://groups.roblox.com/v1/groups/${groupId}/users/${userId}`, {
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

// ============================================================
//  KAYIT SYSTEM - GROUP ROLES
// ============================================================
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

async function kayitKaydRobloxKullanici(username) {
    try {
        const res  = await fetch('https://users.roblox.com/v1/usernames/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
        });
        const data = await res.json();
        if (data?.data?.length > 0) return data.data[0];
        return null;
    } catch {
        return null;
    }
}

async function kayitSetRobloxRank(userId, rankNumber) {
    const roleId = await kayitGetirRoleId(rankNumber);
    if (!roleId) {
        throw new Error(`Rank ${rankNumber} için role ID bulunamadı.`);
    }

    const csrfToken = await getCsrfToken();

    const response = await fetch(`https://groups.roblox.com/v1/groups/${KAYIT_GRUP_ID}/users/${userId}`, {
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

module.exports = {
    getRobloxUser,
    getRobloxUserById,
    getUserRankInGroup,
    getGroupMemberCount,
    getGroupRoles,
    getRoleIdByRank,
    getCsrfToken,
    setRobloxRank,
    kayitGetirGrupRolleri,
    kayitGetirRoleId,
    kayitGruptaMi,
    kayitKaydRobloxKullanici,
    kayitSetRobloxRank
};
