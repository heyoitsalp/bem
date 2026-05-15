const { Events } = require('discord.js');
const { config } = require('../modules/constants');

// For simplicity, keeping some state here or in constants
let sesBagliMi = false;

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState, client) {
        if (oldState.member?.id !== client.user?.id) return;
        
        const SES_KANAL_ID = config.VOICE_CHANNEL_ID;
        if (!SES_KANAL_ID) return;

        if (oldState.channelId === SES_KANAL_ID && !newState.channelId) {
            console.warn('[⚠️ SES] Bot ses kanalından çıkarıldı! Geri dönülüyor...');
            // In a real modular setup, you'd have a voice manager
        }
    },
};
