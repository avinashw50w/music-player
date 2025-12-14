
export class TaskQueue {
    constructor(concurrency = 1) {
        this.concurrency = concurrency;
        this.running = 0;
        this.queue = [];
    }

    /**
     * Add a task to the queue
     * @param {Function} task - Async function to execute
     * @returns {Promise} - Resolves when task completes
     */
    add(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
            this.process();
        });
    }

    async process() {
        if (this.running >= this.concurrency || this.queue.length === 0) return;

        this.running++;
        const { task, resolve, reject } = this.queue.shift();

        try {
            const result = await task();
            resolve(result);
        } catch (e) {
            reject(e);
        } finally {
            this.running--;
            this.process(); // Trigger next task
        }
    }
}

// Singleton instance for song identification
export const identificationQueue = new TaskQueue(1);
