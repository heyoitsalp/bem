const fs = require('fs');
const path = require('path');

class JsonDatabase {
    constructor(fileName) {
        this.filePath = path.join(__dirname, '../../data', fileName);
        this.data = this.load();
    }

    load() {
        if (!fs.existsSync(path.dirname(this.filePath))) {
            fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
        }
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, JSON.stringify({}, null, 4));
            return {};
        }
        try {
            return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        } catch (err) {
            console.error(`[❌ DB] Error loading ${this.filePath}:`, err);
            return {};
        }
    }

    save() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 4));
        } catch (err) {
            console.error(`[❌ DB] Error saving ${this.filePath}:`, err);
        }
    }

    get(key) {
        return this.data[key];
    }

    set(key, value) {
        this.data[key] = value;
        this.save();
    }

    delete(key) {
        delete this.data[key];
        this.save();
    }

    all() {
        return this.data;
    }
}

module.exports = JsonDatabase;
