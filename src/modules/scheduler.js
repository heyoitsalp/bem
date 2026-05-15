class Scheduler {
    constructor() {
        this.tasks = new Map();
    }

    addTask(name, fn, intervalMs) {
        if (this.tasks.has(name)) {
            this.stopTask(name);
        }
        const interval = setInterval(fn, intervalMs);
        this.tasks.set(name, interval);
        console.log(`[📅 SCHEDULER] Task started: ${name} (Interval: ${intervalMs}ms)`);
    }

    stopTask(name) {
        const interval = this.tasks.get(name);
        if (interval) {
            clearInterval(interval);
            this.tasks.delete(name);
            console.log(`[📅 SCHEDULER] Task stopped: ${name}`);
        }
    }

    stopAll() {
        for (const [name, interval] of this.tasks) {
            clearInterval(interval);
        }
        this.tasks.clear();
        console.log(`[📅 SCHEDULER] All tasks stopped.`);
    }
}

module.exports = new Scheduler();
