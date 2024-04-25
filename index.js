require("dotenv").config();
const makeWASocket = require("@whiskeysockets/baileys").default;
const {
	DisconnectReason,
	useMultiFileAuthState,
	downloadMediaMessage,
} = require("@whiskeysockets/baileys");
const { createSticker, StickerTypes } = require("wa-sticker-formatter");
const { getAIResponse } = require("./utils/gemini-ai");
const fs = require("node:fs/promises");

async function connect() {
	const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

	const sock = makeWASocket({
		printQRInTerminal: true,
		auth: state,
	});

	sock.ev.on("connection.update", (update) => {
		const { connection, lastDisconnect } = update;

		if (connection === "close") {
			const shouldReconnect =
				lastDisconnect?.error?.output?.statusCode !==
				DisconnectReason.loggedOut;

			if (shouldReconnect) connect();
		}
	});

	sock.ev.on("creds.update", saveCreds);

	sock.ev.on("messages.upsert", async ({ messages }) => {
		const m = messages[0];
		if (!m.message) return;
		if (m.key.fromMe) return;
		// console.log(JSON.stringify(m, undefined, 2));

		const message =
			m.message?.extendedTextMessage?.text ??
			m.message?.conversation ??
			m.message?.imageMessage?.caption ??
			"";

		if (message.toLocaleLowerCase() === ".help") {
			return sock.sendMessage(m.key.remoteJid, {
				text: await fs.readFile("./utils/help.txt", "utf-8"),
			});
		}

		if (message.startsWith(".ai")) {
			return sock.sendMessage(m.key.remoteJid, {
				text: await getAIResponse(message),
			});
		}

		if (
			m.message?.imageMessage?.caption === ".sticker" ||
			(m.message?.imageMessage?.caption === ".s" && m.message?.imageMessage)
		) {
			const mediaData = await downloadMediaMessage(
				m,
				"buffer",
				{},
				{
					reuploadRequest: sock.updateMediaMessage,
				}
			);
			const stickerOption = {
				pack: "",
				author: "afadhili",
				type: StickerTypes.FULL,
				quality: 50,
			};

			const generateSticker = await createSticker(mediaData, stickerOption);

			await sock.sendMessage(m.key.remoteJid, {
				sticker: generateSticker,
			});
		}
	});
}

connect();
