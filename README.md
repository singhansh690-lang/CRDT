# CRDT Distributed Store

A distributed key-value store using Conflict-Free Replicated Data Types (CRDTs), MongoDB persistence, Git-based versioning, and UDP Multicast for synchronization.

## Features
- **CRDTs**: Support for G-Set, PN-Counter, and OR-Map.
- **Persistence**: State is stored in MongoDB.
- **Versioning**: Every state update is committed to a local Git repository (`history/`) for audit trails.
- **Synchronization**: Nodes discover each other via UDP Multicast and sync state over HTTP.
- **Zero-Config**: Just run multiple instances, they auto-connect.

## Prerequisities
- Node.js
- MongoDB running locally on default port (27017)
- Git installed and in PATH

## Installation
```bash
npm install
```

## Running the System

### 1. Start MongoDB
Ensure your MongoDB server is running.

### 2. Start Nodes
Open multiple terminals and run:

**Terminal 1 (Node A):**
```bash
cd crdt-distributed-store
npm run start:nodeA
```

**Terminal 2 (Node B):**
```bash
cd crdt-distributed-store
npm run start:nodeB
```

**Terminal 3 (Node C):**
```bash
cd crdt-distributed-store
npm run start:nodeC
```

### 3. Usage
Use curl or Postman to interact with the nodes.

**Add to Set:**
```bash
curl -X POST http://localhost:3000/gset -H "Content-Type: application/json" -d '{"value": "apple"}'
```

**Increment Counter:**
```bash
curl -X POST http://localhost:3001/counter/inc -d '{"amount": 5}'
```

**Set Key in Map:**
```bash
curl -X POST http://localhost:3000/map -H "Content-Type: application/json" -d '{"key": "user:1", "value": {"name": "Alice"}}'
```

### 4. Synchronization
Sync happens automatically via Multicast discovery (every 5s).
To force a sync manually:
```bash
node scripts/trigger-sync.js
```

### 5. View History
Check the `history/` folder. It is a Git repository containing the state history of your nodes.
```bash
cd history
git log --graph --oneline --all
```
