import * as dotenv from "dotenv";
dotenv.config();
import { Configuration, OpenAIApi } from "openai";
import { getPrompt, improvePrompt } from "./prompts.js";

async function main(sourceData, apiKey, transFormAsText, userFeedback = ``) {
	const configuration = new Configuration({
		apiKey: apiKey || process.env.OPENAI_API_KEY,
	});
	const openai = new OpenAIApi(configuration);
	const prompt = userFeedback ? improvePrompt(sourceData, transFormAsText, userFeedback) : getPrompt(sourceData);
	try {
		const response = await openai.createChatCompletion({
			// @ts-ignore
			messages: prompt,
			model: "gpt-3.5-turbo",
			temperature: 0,
		});
		//usually we'll get valid code
		const gptContent = response.data.choices[0].message.content;
		if (isValidJs(gptContent)) return gptContent;

		//sometime we'll get a bunch of nonsense before and after
		const parsedCode = parseCodeFromGPT(gptContent);
		if (isValidJs(parsedCode)) return parsedCode;

		//at this point, we're probably screwed
		return gptContent;
	} catch (e) {
		console.error(e.response.data);
		throw e;
	}
}

function isValidJs(gptString) {
	try {
		eval(`var fooBarBazQuxMuxDux = ${gptString}`);
		return true;
	} catch (e) {
		throw `invalid js`;
	}
}

function parseCodeFromGPT(gptString) {
	try {
		const parsed = gptString.match(/(?<=\n\n)(.*)(?=\n\n)/gs)[0];
		const valid = parsed.replace("```", "").replace("```", "");
		return valid;
	} catch (e) {
		throw `could not parse code from GPT string`;
	}
}

export default main;
