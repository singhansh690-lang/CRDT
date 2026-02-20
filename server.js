require("dotenv").config();
const express = require("express");
const GSet = require("./crdt/gset");
const PNCounter = require("./crdt/counter");
const ORMap = require("./crdt/ormap");
const State = require("./db");
const { socket, GROUP, PORT } = require("./multicast");

const app = express();
app.use(express.json());

// Use dynamic port to support multiple instances (Node A on 3000, Node B on 3001)
const APP_PORT = process.env.PORT || 3000;
const ID = process.env.NODE_ID || `node-${APP_PORT}`;

let gset = new GSet();
let counter = new PNCounter(ID);
let ormap = new ORMap(ID);

function broadcast() {
    const data = JSON.stringify({
        nodeId: ID,
        gset: gset.data ? Array.from(gset.data) : gset.toJSON(),
        counter: counter.state,
        ormap: ormap.map // User code only sends data map
    });

    // Send via multicast socket
    socket.send(data, PORT, GROUP, (err) => {
        if (err) console.error("Broadcast failed:", err);
    });
}

socket.on("message", (msg, rinfo) => {
    try {
        const Remote = JSON.parse(msg.toString());
        if (Remote.nodeId === ID) return; // Ignore self

        // console.log(`Received update from ${Remote.nodeId}`);

        if (Remote.gset) gset.merge({ data: new Set(Remote.gset) });
        if (Remote.counter) counter.merge({ state: Remote.counter });
        if (Remote.ormap) ormap.merge(Remote.ormap);
    } catch (e) {
        console.error("Message parse error:", e);
    }
});

app.post("/add/:value", (req, res) => {
    gset.add(req.params.value);
    broadcast();
    res.send("Added to GSet");
});

app.post("/gset", (req, res) => { // Alias for client compatibility
    gset.add(req.body.value);
    broadcast();
    res.json({ success: true });
});

app.post("/inc", (req, res) => {
    counter.inc();
    broadcast();
    res.send("Counter incremented");
});

app.post("/counter/inc", (req, res) => { // Alias
    counter.inc();
    broadcast();
    res.json({ success: true });
});

app.post("/map/:key/:value", (req, res) => {
    ormap.set(req.params.key, req.params.value);
    broadcast();
    res.send("Map updated");
});

app.get("/state", async (req, res) => {
    res.json({
        gset: Array.from(gset.values()),
        counter: counter.value(),
        ormap: ormap.map
    });
});

app.get("/gset", (req, res) => res.json({ values: Array.from(gset.values()) }));
app.get("/counter", (req, res) => res.json({ value: counter.value() }));


app.listen(APP_PORT, () => {
    console.log(`Replica ${ID} running on port ${APP_PORT}`);
});
