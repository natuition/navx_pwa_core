#!/usr/bin/env node
/*
Simple WebSocket -> TCP proxy for NTRIP testing
Usage:
  node ntrip-ws-proxy.js [--listenPort 8080]

Connect from browser with ws://localhost:8080/?host=crtk.net&port=2101
Or use wss if you add TLS in front.

This proxy is intended for local development only.
*/

const WebSocket = require('ws');
const net = require('net');
const url = require('url');

const args = process.argv.slice(2);
let listenPort = 8080;
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--listenPort' && args[i + 1]) {
        listenPort = parseInt(args[i + 1], 10);
    }
}

const wss = new WebSocket.Server({ port: listenPort }, () => {
    console.log(`NTRIP WS->TCP proxy listening on ws://localhost:${listenPort}`);
});

wss.on('connection', (ws, req) => {
    const q = url.parse(req.url, true).query;
    const host = q.host;
    const port = parseInt(q.port || '2101', 10);

    if (!host) {
        ws.close(1008, 'Missing ?host= in query string');
        return;
    }

    console.log(`Proxying websocket -> ${host}:${port}`);

    const tcpSocket = net.connect(port, host, () => {
        console.log(`TCP connected to ${host}:${port}`);
    });

    tcpSocket.on('data', (chunk) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(chunk);
    });

    tcpSocket.on('close', () => {
        try { ws.close(); } catch (e) { }
        console.log('TCP socket closed');
    });

    tcpSocket.on('error', (err) => {
        console.error('TCP error:', err.message);
        try { ws.close(); } catch (e) { }
    });

    ws.on('message', (message) => {
        // message may be string (for initial GET) or Buffer
        if (!tcpSocket.destroyed) {
            tcpSocket.write(message);
        }
    });

    ws.on('close', () => {
        try { tcpSocket.end(); } catch (e) { }
        console.log('WebSocket closed');
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err.message);
        try { tcpSocket.end(); } catch (e) { }
    });
});

wss.on('error', (err) => {
    console.error('WebSocket server error:', err.message);
});

// Notes:
// - Each incoming WebSocket connection corresponds to one TCP connection to the requested host:port.
// - The proxy does NOT maintain any shared state between connections; data is piped bi-directionally.
// - Concurrency model: Node.js handles each socket with its event loop; the OS handles TCP sockets.
//   There's no explicit thread-per-client; Node uses non-blocking I/O and scales to many concurrent sockets
//   depending on OS limits (file descriptors) and available resources.
// - Security: this is a development helper. Do NOT expose this proxy publicly without hardening (TLS, auth,
//   rate-limiting, input validation). In production prefer a vetted proxy solution or server-side implementation.
