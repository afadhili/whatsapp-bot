const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_AI_API);

const getAIResponse = async (text) => {
	const msg = text.replace(".ai", "");
	if (!msg) return "Please provide a prompt";

	try {
		const model = genAI.getGenerativeModel({ model: "gemini-pro" });
		const result = await model.generateContent(msg);
		const response = await result.response.text();
		return response;
	} catch (error) {
		console.log(error);
		return "Oops something went wrong!";
	}
};

module.exports = { getAIResponse };
