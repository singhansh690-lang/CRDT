const dgram = require("dgram");

const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
const GROUP = "239.255.255.250";
const PORT = 41234;

socket.on('error', (err) => {
    console.error(`Multicast socket error:\n${err.stack}`);
});

socket.bind(PORT, () => {
    socket.setBroadcast(true);
    try {
        socket.addMembership(GROUP);
        console.log(`Multicast bound to ${PORT} and joined ${GROUP}`);
    } catch (e) {
        console.log("Multicast addMembership failed:", e.message);
    }
});

module.exports = { socket, GROUP, PORT };
