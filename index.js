#! /usr/bin/env node

import esMain from "es-main";
import * as dotenv from "dotenv";
import path from "path";
import inquirer from "inquirer";
import inquirerFileTreeSelection from "inquirer-file-tree-selection-prompt";
inquirer.registerPrompt("file-tree-selection", inquirerFileTreeSelection);
import { existsSync } from "fs";

dotenv.config();
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { name: NAME, version: VERSION } = require("./package.json");

import cli from "./cli/cli.js";
// import server from "./server/server.js";
import storage from "./components/persistence.js";

// eslint-disable-next-line no-unused-vars
import * as c from "./cli/colors.js";
import u from "ak-tools";
import Papa from "papaparse";
//tracking
const track = u.tracker(`${NAME}-${VERSION}`, `beec588098f307aea3674d97130498ca`);
const sessionId = u.uuid();

import gpt, { getGPTModels } from "./components/openai.js";
import mixpanel from "./components/mixpanel.js";

const divider = `\n---------------------------------\n`.rainbow;

/**
 * do stuff
 * @param  {Types.Config | Object} config
 */
async function main(config) {
	track("start", { sessionId });
	let { format = ``, openai_api_key = ``, mixpanel_secret = ``, file = "" } = config;
	//if no file use args
	if (!file) file = config?._?.[0] || "";

	//check for open ai key + store
	if (!openai_api_key) openai_api_key = await getOpenAIKey();

	//check for mixpanel project secret + store
	if (!mixpanel_secret) mixpanel_secret = await getMixpanelProjectSecret();

	//select a GPT model
	console.log("\n");
	let selectedModel = await selectGPTModel(openai_api_key);

	//check format + parse
	const sourceData = await getFormatAndDataAsJson(file, format);

	//these vars will be used in the feedback loop
	let transform = () => {};
	let transformAsText = ``;
	let log = ``;
	let shouldContinue = false;
	let userFeedback = ``;
	let temperature = 0;

	//feedback loop
	feedbackLoop: while (shouldContinue === false) {
		track("attempt", { sessionId, selectedModel, temperature });
		try {
			({ transform, log, transformAsText } = await gptWriteTransform(
				sourceData,
				openai_api_key,
				transformAsText,
				userFeedback,
				selectedModel,
				temperature
			));
			track("success", { sessionId, selectedModel, temperature });
		} catch (e) {
			console.log(`ERROR: ${selectedModel} failed to write valid javascript`.red);
			track("fail", { sessionId });
			const { shouldContinue } = await inquirer.prompt([
				{
					type: `confirm`,
					name: `shouldContinue`,
					message: `Do you want to try again?`,
					default: true,
				},
			]);
			if (shouldContinue) {
				temperature += 0.1; //turn up the heat!
				selectedModel = await selectGPTModel(openai_api_key); //try a different model
				track("fail", { sessionId, selectedModel, temperature });
				continue feedbackLoop;
			} else {
				track("quit", { sessionId, selectedModel, temperature });
				console.log(`OK BYE!\n\n`.rainbow);
				process.exit(0);
			}
		}

		console.log(divider);

		({ shouldContinue } = await inquirer.prompt([
			{
				type: `confirm`,
				name: `shouldContinue`,
				message: `Look at the transform ^^^^\nDoes this look correct?`,
				default: true,
			},
		]));

		if (shouldContinue === false) {
			track("revise", { sessionId, selectedModel, temperature });
			console.log(divider);
			console.log(`acknowledged...\n`);
			({ userFeedback } = await inquirer.prompt([
				{
					type: `input`,
					name: `userFeedback`,
					message: `Let me try again.. What is wrong with the transform? Be specific...\n`,
				},
			]));
		} else {
			track("accept", { sessionId, selectedModel, temperature });
			console.log(divider);
			console.log(`👍 😎 👌` + `\tAWESOME!`.rainbow + `\n\n`);
		}
	}

	//log
	//check if ./tmp exists
	const tmpExists = existsSync("./tmp");
	if (tmpExists) {
		await u.touch(`./tmp/gtp-log-${Date.now()}.txt`, log, false);
	} else {
		await u.touch(`./gtp-log-${Date.now()}.txt`, log, false);
	}

	const { shouldImport } = await inquirer.prompt([
		{
			type: `confirm`,
			name: `shouldImport`,
			message: `Do you want to import ${sourceData.length} events?`,
			default: true,
		},
	]);

	//data import
	if (shouldImport) {
		track("start import", { sessionId, selectedModel, temperature });
		const imported = await mixpanel(sourceData, config, transform);
		const { success, batches, failed, eps, rps, total } = imported;
		track("finish import", { sessionId, selectedModel, temperature, success, batches, failed, eps, rps, total });
		console.log(`\n\nRESULTS:`.cyan);
		console.log(u.json(imported));
		return imported;
	} else {
		track("quit", { sessionId, selectedModel, temperature });
		console.log(`\n\nOK BYE!\n\n`.rainbow);
		process.exit(0);
	}
}

async function selectGPTModel(openai_key) {
	const models = await getGPTModels(openai_key);
	const { selectedModel } = await inquirer.prompt([
		{
			type: `list`,
			name: `selectedModel`,
			message: `Select a GPT model`,
			choices: models,
			default: `gpt-3.5-turbo`,
		},
	]);
	return selectedModel;
}

async function gptWriteTransform(sourceData, openai_key, transFormAsText = ``, userFeedback = ``, model, temperature) {
	console.log(`\n\nCONSULTING ${model.toUpperCase()}...`.cyan);
	const transformAsText = await gpt(sourceData[0], openai_key, transFormAsText, userFeedback, model, temperature);
	console.log(`\t...we got a response!\n\n`.yellow);
	let transform;
	let transformSample;
	try {
		eval(`transform = ${transformAsText}`);
		// @ts-ignore
		transformSample = transform(sourceData[0]);
	} catch (e) {
		console.error(transformAsText);
		console.error(e);
		throw `transform failed`;
	}

	//show the user what's about to happen:
	console.log(`\n\nSOURCE:`.red);
	console.log(u.json(sourceData[0]));
	console.log(`\n\nFUNCTION:`.blue);
	console.log(transformAsText);
	console.log(`\n\nTRANSFORMED:`.green);
	console.log(transformSample);

	//this is the log
	const log = `${new Date()}`
		.concat(`\n\nSOURCE (sample):\n${u.json(sourceData[0])}`)
		.concat(`\n\nFUNCTION WRITTEN:\n${transformAsText}`)
		.concat(`\n\nTRANSFORMED (sample):\n${u.json(transformSample)}`);

	return { transform, log, transformAsText };
}

async function getFormatAndDataAsJson(file, format) {
	let parsedFile;
	console.log(`\n\nLooking for file...`.cyan);
	//if no file, ask for it
	if (!file) {
		({ file } = await inquirer.prompt([
			{
				type: "file-tree-selection",
				name: `file`,
				message: `choose your file`,
				enableGoUpperDirectory: true,
			},
		]));

		//strip quotes from file
		// file = file.replace(/"/g, "").replace(/'/g, "");
		file = path.normalize(file);
	} else {
		console.log(`\t...found file: ${file}`.yellow);
	}
	//if no format, try to guess based on file extension
	if (file && !format) {
		if (file.toLowerCase().endsWith(".jsonl") || file.toLowerCase().endsWith(".ndjson")) {
			format = "jsonl";
		} else if (file.toLowerCase().endsWith(".json")) {
			format = "json";
		} else if (file.toLowerCase().endsWith(".csv") || file.toLowerCase().endsWith(".tsv")) {
			format = "csv";
		}
	}

	//jsonl
	if (file && ["jsonl", "ndjson"].includes(format)) {
		// @ts-ignore
		parsedFile = (await u.load(file)).split("\n").map(JSON.parse);
	}

	//json
	else if (file && ["json"].includes(format)) {
		parsedFile = await u.load(file, true);
	}

	//csv
	else if (file && ["csv", "tsv"].includes(format)) {
		const data = await u.load(file, false);
		const parsed = Papa.parse(data, {
			header: true,
			skipEmptyLines: true,
		}).data;
		parsedFile = parsed.map((obj) => {
			return u.objFilt(
				obj,
				(key) => {
					if (key === "") return false;
					if (key.startsWith("_")) return false;
					return true;
				},
				"key"
			);
		});
	}

	//array of objects
	else if (Array.isArray(file)) {
		parsedFile = file;
	}

	//single object
	else if (typeof file === "object") {
		parsedFile = [file];
	} else {
		throw `unsupported format`;
	}

	return parsedFile;
}

async function getOpenAIKey() {
	console.log(`\n\nlooking for OpenAI key...`.cyan);
	//first check env
	if (process.env.OPENAI_API_KEY) {
		console.log(`\t...found OpenAI key from env`.yellow + `  👍`);
		return process.env.OPENAI_API_KEY;
	}

	//then check storage
	const key_in_storage = await storage.get(`openai_api_key`);

	if (key_in_storage) {
		console.log(`\t...found OpenAI from storage`.yellow + `  👍`);
		process.env.OPENAI_API_KEY = key_in_storage;
		return key_in_storage;
	}
	console.log(`\t...didn't find it`.red + `  👎\n`);
	//then ask
	const { openai_api_key } = await inquirer.prompt([
		{
			type: `input`,
			name: `openai_api_key`,
			message: `What is your OpenAI key?`,
		},
	]);

	const shouldSaveOpenAIKey = await genericConfirm(`Do you want to save your OpenAI API key for future use?`);
	if (shouldSaveOpenAIKey) await storage.set(`openai_api_key`, openai_api_key);
	process.env.OPENAI_API_KEY = openai_api_key;
	return openai_api_key;
}

async function getMixpanelProjectSecret() {
	console.log(`\n\nlooking for Mixpanel project secret...`.cyan);
	//first check env
	if (process.env.MIXPANEL_SECRET) {
		console.log(`\t...found Mixpanel project secret from env`.yellow + `  👍\n`);
		return process.env.MIXPANEL_SECRET;
	}

	//then check storage
	const key_in_storage = await storage.get(`mixpanel_secret`);
	if (key_in_storage) {
		console.log(`\t...found Mixpanel project secret from storage`.yellow + `  👍\n`);
		process.env.MIXPANEL_SECRET = key_in_storage;
		return key_in_storage;
	}
	console.log(`\t...didn't find it`.red + `  👎\n`);
	//then ask
	const { mixpanel_secret } = await inquirer.prompt([
		{
			type: `input`,
			name: `mixpanel_secret`,
			message: `What is your Mixpanel's Project Secret?`,
		},
	]);
	process.env.MIXPANEL_SECRET = mixpanel_secret;
	const shouldSaveMixpanelSecret = await genericConfirm(`Do you want to save your Mixpanel Secret for future use?`);
	if (shouldSaveMixpanelSecret) await storage.set(`mixpanel_secret`, mixpanel_secret);
	return mixpanel_secret;
}

async function genericConfirm(msg = `Confirm?`) {
	const { confirm } = await inquirer.prompt([
		{
			type: `confirm`,
			name: `confirm`,
			message: msg,
			default: true,
		},
	]);
	return confirm;
}

if (esMain(import.meta)) {
	const params = cli();

	if (params.clear) {
		storage
			.remove()
			.then(() => {
				console.log(`\n\nstorage cleared!\n\n`.cyan);
			})
			.catch((e) => {
				console.log(`\nuh oh! something didn't work...\nthe error message is:\n\n\t${e.message}\n\n`.red);
			})
			.finally(() => {
				process.exit(0);
			});
	} else {
		main(params)
			.then(() => {
				//noop
			})
			.catch((e) => {
				console.log(`\nuh oh! something didn't work...\nthe error message is:\n\n\t${e.message}\n\n`.red);
			})
			.finally(() => {
				console.log("\n\nhave a great day!\n\n".cyan);
				process.exit(0);
			});
	}
}

export default main;
