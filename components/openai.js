import * as dotenv from "dotenv";
dotenv.config();
import { Configuration, OpenAIApi } from "openai";
import { getPrompt, improvePrompt } from "./prompts.js";

async function main(sourceData, apiKey, userFeedback = ``) {
	const configuration = new Configuration({
		apiKey: apiKey || process.env.OPENAI_API_KEY,
	});
	const openai = new OpenAIApi(configuration);
	const prompt = userFeedback ? improvePrompt(sourceData, userFeedback) : getPrompt(sourceData);
	try {
		const response = await openai.createChatCompletion({
			// @ts-ignore
			messages: prompt,
			model: "gpt-3.5-turbo",
			temperature: 0,
		});
		return response.data.choices[0].message.content;
	} catch (e) {
		console.error(e.response.data);
		throw e;
	}
}

export default main;
