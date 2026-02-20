const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');

class GitHistory {
    constructor(nodeId) {
        this.nodeId = nodeId;
        // Use a separate directory for each node to avoid locking issues
        this.repoPath = path.resolve(__dirname, 'history', nodeId);
        if (!fs.existsSync(this.repoPath)) {
            fs.mkdirSync(this.repoPath, { recursive: true });
        }
        this.git = simpleGit(this.repoPath);
        this.baseHistoryPath = path.resolve(__dirname, 'history');
    }

    async init() {
        try {
            if (!fs.existsSync(path.join(this.repoPath, '.git'))) {
                await this.git.init();
                await this.git.addConfig('user.name', this.nodeId);
                await this.git.addConfig('user.email', `${this.nodeId}@crdt.local`);
                // Create initial commit
                fs.writeFileSync(path.join(this.repoPath, 'state.json'), '{}');
                await this.git.add('state.json');
                await this.git.commit('Initial commit');
                // Create a branch named after the node (optional, main/master is fine since repo is per-node)
            }
        } catch (e) {
            console.error(`Git init error for ${this.nodeId}:`, e);
        }
    }

    async commitState(state, message = 'Update state') {
        try {
            const statePath = path.join(this.repoPath, 'state.json');
            fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
            await this.git.add('state.json');
            // Check if there are changes
            const status = await this.git.status();
            if (status.modified.length > 0) {
                await this.git.commit(message);
            }
        } catch (e) {
            console.error(`Git commit error for ${this.nodeId}:`, e);
        }
    }

    async recordMerge(remoteNodeId, state) {
        try {
            const remotePath = path.resolve(this.baseHistoryPath, remoteNodeId);

            // Check if remote exists
            if (!fs.existsSync(remotePath)) {
                // If remote doesn't exist locally (maybe on another machine?), just do a normal commit
                console.warn(`Remote repo ${remoteNodeId} not found locally. Doing normal commit.`);
                return await this.commitState(state, `Merge from ${remoteNodeId}`);
            }

            // Add remote if not exists
            const remotes = await this.git.getRemotes();
            if (!remotes.find(r => r.name === remoteNodeId)) {
                await this.git.addRemote(remoteNodeId, remotePath);
            }

            // Fetch
            await this.git.fetch(remoteNodeId);

            // Merge with "ours" strategy to create the merge commit line in history
            // but keep our working directory clean (we will overwrite it with the CRDT result next)
            try {
                // Using --no-commit to allow us to update the state file before finalizing
                await this.git.merge([`${remoteNodeId}/master`, '--strategy=ours', '--no-commit']);
            } catch (e) {
                // If merge fails (unlikely with 'ours'), just continue
                console.error(`Merge command failed, continuing manual merge: ${e.message}`);
            }

            // Write the actual merged CRDT state
            const statePath = path.join(this.repoPath, 'state.json');
            fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

            await this.git.add('state.json');
            await this.git.commit(`Merged state from ${remoteNodeId}`);

        } catch (e) {
            console.error(`Git record merge error for ${this.nodeId}:`, e);
            // Fallback
            await this.commitState(state, `Merge from ${remoteNodeId} (fallback)`);
        }
    }
}

module.exports = GitHistory;
