const JsonDatabase = require('./jsonDatabase');

class AutoResponder {
    constructor() {
        this.db = new JsonDatabase('auto_responses.json');
        this.responses = this.db.all();
    }

    add(trigger, response) {
        this.responses[trigger.toLowerCase()] = response;
        this.db.set(trigger.toLowerCase(), response);
    }

    remove(trigger) {
        delete this.responses[trigger.toLowerCase()];
        this.db.delete(trigger.toLowerCase());
    }

    handle(message) {
        const content = message.content.toLowerCase();
        for (const trigger in this.responses) {
            if (content.includes(trigger)) {
                return this.responses[trigger];
            }
        }
        return null;
    }

    getAll() {
        return this.responses;
    }
}

module.exports = new AutoResponder();
