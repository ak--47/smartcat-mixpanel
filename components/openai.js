import * as dotenv from "dotenv";
dotenv.config();
import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
	apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function main(sourceData) {
	const prefix = `can you help me transform the following source data:\n\n`;
	const postfix = `\n\ninto a well structured mixpanel event\n\nshow the answer in a code snippet as a single javascript function called "transformer" which takes a single input - the source data - and returns the mixpanel event`;
	const dataSample = sourceData;
	const prompt = prefix + dataSample + postfix;
	try {
		const response = await openai.createCompletion({
			model: "text-davinci-003",
			prompt,
			temperature: 0,
			max_tokens: 4097 - prompt.length,
		});
		return response.data;
	} catch (e) {
		console.error(e.response.data);
		throw e;
	}
}

export default main;
