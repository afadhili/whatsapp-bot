require("dotenv").config();
const makeWASocket = require("@whiskeysockets/baileys").default;
const {
	DisconnectReason,
	useMultiFileAuthState,
} = require("@whiskeysockets/baileys");

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_AI_API);

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
		if (messages[0].key.fromMe) return;

		const messageText = messages[0].message.conversation;
		const remoteJid = messages[0].key.remoteJid;

		await sock.readMessages([messages[0].key]);

		console.log(JSON.stringify(messages[0], undefined, 2));

		const response = await getAIResponse(messageText);

		await sock.sendMessage(remoteJid, {
			text: response,
		});

		console.log(`
    Responding to ${remoteJid} : ${messageText} 
    Response : ${response}`);
	});
}

const getAIResponse = async (text) => {
	const model = genAI.getGenerativeModel({ model: "gemini-pro" });
	const result = await model.generateContent(text);
	const response = await result.response.text();

	return response;
};

connect();
