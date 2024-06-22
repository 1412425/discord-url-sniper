"use strict";

const tls = require("tls");
const WebSocket = require("ws");
const extractJsonFromString = require("extract-json-from-string");

let vanity;
const guilds = {};
let websocket;
let start;
let end;

const authToken = "SNİPER TOKEN";
const host = "canary.discord.com";

const commonHeaders = [
    `Host: ${host}`,
    `Authorization: ${authToken}`,
    "Content-Type: application/json"
];

const patchGuildVanityUrlHeader = [
    "PATCH /api/v7/guilds/SERVER ID/vanity-url HTTP/1.2",
    ...commonHeaders
].join("\r\n");

const postMessageHeader = [
    "POST /api/v9/channels/CHANNEL ID/messages HTTP/1.2",
    ...commonHeaders
].join("\r\n");

function connectWebSocket() {
    websocket = new WebSocket("wss://gateway-us-east1-b.discord.gg");

    websocket.onclose = (event) => {
        console.log(`ws kapandi ${event.code}`);
        connectWebSocket();
    };

    websocket.onmessage = async (message) => {
        const data = JSON.parse(message.data);
        const { d, op, t } = data;

        if (t === "GUILD_UPDATE" || t === "GUILD_DELETE") {
            handleGuildUpdateOrDelete(d);
        } else if (t === "READY") {
            handleReadyEvent(d);
        }

        if (op === 10) {
            websocket.send(JSON.stringify({
                op: 2,
                d: {
                    token: authToken,
                    intents: 1,
                    properties: {
                        os: "MacOs",
                        browser: "Brave",
                        device: ""
                    }
                }
            }));
            setInterval(() => websocket.send(JSON.stringify({ op: 1, d: {}, s: null, t: "heartbeat" })), d.heartbeat_interval);
        } else if (op === 7) {
            process.exit();
        }
    };

    setInterval(() => {
        tlsSocket.write(["GET / HTTP/1.2", `Host: ${host}`, "", ""].join("\r\n"));
    }, 7500);
}

function handleGuildUpdateOrDelete(d) {
    const find = guilds[d.guild_id || d.id];
    if (find) {
        start = Date.now();
        const requestBody = JSON.stringify({ code: find });
        const request = [
            patchGuildVanityUrlHeader,
            `Content-Length: ${requestBody.length}`,
            "",
            requestBody
        ].join("\r\n");
        tlsSocket.write(request);
        vanity = `discord.gg/${find}`;
    }
}

function handleReadyEvent(d) {
    d.guilds.forEach((guild) => {
        if (guild.vanity_url_code) {
            guilds[guild.id] = guild.vanity_url_code;
        } else {
            console.log(guild.name);
        }
    });
    console.log(guilds);
}

const tlsSocket = tls.connect({
    host: host,
    port: 8443
});

tlsSocket.on("data", async (data) => {
    const dataString = data.toString();
    const ext = extractJsonFromString(dataString);
    const find = ext.find((e) => e.code) || ext.find((e) => e.message);

    if (find) {
        end = Date.now();
        console.log(find);
        console.log("siz bizi gecemezsiniz",end - start,"ms");

        const requestBody = JSON.stringify({
            content: `@everyone ${vanity} ${end - start}ms\n\`\`\`json\n${JSON.stringify(find)}\`\`\``
        });
        const contentLength = Buffer.byteLength(requestBody);
        const request = [
            postMessageHeader,
            `Content-Length: ${contentLength}`,
            "",
            requestBody
        ].join("\r\n");
        tlsSocket.write(request);
    }
});

tlsSocket.on("error", (error) => {
    console.log("tls err", error);
    process.exit();
});

tlsSocket.on("end", () => {
    console.log("tls kapandi");
    process.exit();
});

tlsSocket.on("secureConnect", connectWebSocket);