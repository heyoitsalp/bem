const express = require('express');
const app = express();

app.use(express.json());

const status = {
    isGameOpen: true,
    isMarketOpen: true,
    isAdaletSarayOpen: false
};

// Roblox sunucularından gelen verileri saklamak için
const robloxServers = new Map();

app.get('/check-status', (req, res) => {
    res.json({ 
        open: status.isGameOpen, 
        market: status.isMarketOpen, 
        adaletSaray: status.isAdaletSarayOpen 
    });
});

app.post('/api/oc-playerlist', (req, res) => {
    const secret = req.headers['x-nexus-secret'];
    if (secret !== 'senturabem') return res.status(403).json({ error: 'Unauthorized' });

    const { serverId, placeId, userIds, serverBans } = req.body;
    
    robloxServers.set(serverId, {
        placeId,
        players: userIds || [],
        bans: serverBans || [],
        lastUpdate: Date.now()
    });

    // 5 dakika boyunca güncellenmeyen sunucuları temizle
    const now = Date.now();
    for (const [id, data] of robloxServers.entries()) {
        if (now - data.lastUpdate > 300000) robloxServers.delete(id);
    }

    res.json({ success: true });
});

app.post('/update-adalet', (req, res) => {
    const { status: newStatus } = req.body;
    
    if (typeof newStatus === 'boolean') {
        status.isAdaletSarayOpen = newStatus;
        res.json({ success: true, current: status.isAdaletSarayOpen });
    } else {
        res.status(400).json({ success: false, error: 'Geçersiz veri tipi.' });
    }
});

const startApi = (port) => {
    app.listen(port, () => console.log(`API ${port} portunda aktif.`));
};

module.exports = { status, startApi, robloxServers };