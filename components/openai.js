import * as dotenv from "dotenv";
dotenv.config();
import { Configuration, OpenAIApi } from "openai";
import { getPrompt, improvePrompt } from "./prompts.js";

async function main(sourceData, apiKey, transFormAsText, userFeedback = ``, model = `gpt-3.5-turbo`, temperature = 0) {
	const configuration = new Configuration({
		apiKey: apiKey,
	});
	const openai = new OpenAIApi(configuration);
	const prompt = userFeedback ? improvePrompt(sourceData, transFormAsText, userFeedback) : getPrompt(sourceData);
	try {
		const response = await openai.createChatCompletion({
			// @ts-ignore
			messages: prompt,
			model: model,
			temperature: temperature,
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

export async function getGPTModels(apiKey) {
	//valid chat models
	// ? https://platform.openai.com/docs/models/model-endpoint-compatibility
	const chatModels = ["gpt-4", "gpt-4-0314", "gpt-4-32k", "gpt-4-32k-0314", "gpt-3.5-turbo", "gpt-3.5-turbo-0301"];
	try {
		const configuration = new Configuration({ apiKey: apiKey });
		const openai = new OpenAIApi(configuration);
		const models = await openai.listModels();
		const validModels = models.data.data.filter((model) => chatModels.includes(model.id)).map((model) => model.id);
		return validModels;
	} catch (e) {
		console.log(`ERROR: could not enumerate models`.red);
		return [`gpt-3.5-turbo`];
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
