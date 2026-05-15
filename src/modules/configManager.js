const fs = require('fs');
const path = require('path');

class ConfigManager {
    constructor() {
        this.configPath = path.join(__dirname, '../config.json');
        this.config = this.load();
    }

    load() {
        if (!fs.existsSync(this.configPath)) {
            console.error(`[❌ CONFIG] ${this.configPath} not found!`);
            return {};
        }
        try {
            return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        } catch (err) {
            console.error(`[❌ CONFIG] Error reading config:`, err);
            return {};
        }
    }

    get(key, defaultValue = null) {
        // First check environment variables
        const envKey = key.toUpperCase();
        if (process.env[envKey] !== undefined) {
            return process.env[envKey];
        }
        
        // Then check config.json
        if (this.config[key] !== undefined) {
            return this.config[key];
        }
        
        return defaultValue;
    }

    set(key, value) {
        this.config[key] = value;
        fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 4));
    }
}

module.exports = new ConfigManager();
