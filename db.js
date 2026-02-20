const GSet = require('./crdt/gset');
const PNCounter = require('./crdt/counter');
const ORMap = require('./crdt/ormap');
const { StateModel } = require('./db-mongo');
const GitHistory = require('./git-history');

class DB {
    constructor(nodeId) {
        this.nodeId = nodeId;
        this.gset = new GSet();
        this.counter = new PNCounter(nodeId);
        this.map = new ORMap(nodeId);
        this.gitHistory = null;
    }

    async init() {
        // Load state from MongoDB
        try {
            let record = await StateModel.findOne({ nodeId: this.nodeId });
            if (record && record.state) {
                console.log(`Loading state for node ${this.nodeId} from DB...`);
                // Hydrate CRDTs
                if (record.state.gset) this.gset.merge({ data: new Set(record.state.gset) });
                if (record.state.counter) this.counter.merge(record.state.counter);
                if (record.state.map) this.map.merge(record.state.map);
            } else {
                console.log(`No existing state for node ${this.nodeId}, starting fresh.`);
            }

            // Initialize Git history tracking
            this.gitHistory = new GitHistory(this.nodeId);
            await this.gitHistory.init();

        } catch (e) {
            console.error('DB Init Error:', e);
        }
    }

    async save(remoteNodeId = null) {
        const state = this.getState();

        // Save to MongoDB
        try {
            await StateModel.findOneAndUpdate(
                { nodeId: this.nodeId },
                { state: state, lastUpdated: new Date() },
                { upsert: true, new: true }
            );

            // Save to Git
            if (this.gitHistory) {
                if (remoteNodeId) {
                    await this.gitHistory.recordMerge(remoteNodeId, state);
                } else {
                    await this.gitHistory.commitState(state, `Update from ${this.nodeId} at ${new Date().toISOString()}`);
                }
            }

        } catch (e) {
            console.error('Save Error:', e);
        }
    }

    // Merge incoming state from another replica
    async merge(remoteState) {
        if (remoteState.gset) {
            this.gset.merge({ data: remoteState.gset });
        }
        if (remoteState.counter) {
            this.counter.merge(remoteState.counter);
        }
        if (remoteState.map) {
            this.map.merge(remoteState.map);
        }

        // Save with merge info
        await this.save(remoteState.nodeId);
    }

    // Get the full state of the DB to send to other replicas
    getState() {
        return {
            nodeId: this.nodeId,
            gset: Array.from(this.gset.values()), // Convert Set to Array for JSON
            counter: this.counter.toJSON(),
            map: this.map.toJSON()
        };
    }
}

module.exports = DB;
