import * as dotenv from "dotenv";
dotenv.config();
import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
	apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function main(sourceData, uuidKey) {
	const prefix = `can you help me transform the following source data into a mixpanel event:\n\n`;
	const postfix = `\n\na mixpanel event must have a top level key called "event" which is the name of the event and another top level key called properties whose value is an object. properties must contain a key "time" which is unix epoch time as well as a "distinct_id" which is the ${uuidKey} value in the source data\n\nshow the answer in a code snippet as a syntactically valid javascript function DECLARATION which takes a single input - the source data - and returns the mixpanel event`;
	const dataSample = JSON.stringify(sourceData);
	const prompt = prefix + dataSample + postfix;
	try {
		const response = await openai.createCompletion({
			model: "text-davinci-003",
			prompt,
			temperature: 0,
			max_tokens: 4097 - prompt.length,
		});
		return response.data.choices[0].text;
	} catch (e) {
		console.error(e.response.data);
		throw e;
	}
}

export default main;
