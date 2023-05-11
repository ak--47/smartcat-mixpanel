#! /usr/bin/env node

import esMain from "es-main";
import * as dotenv from "dotenv";
import inquirer from "inquirer";
import path from "path";
dotenv.config();

import cli from "./cli/cli.js";
// import server from "./server/server.js";
import storage from "./components/persistence.js";

// eslint-disable-next-line no-unused-vars
import * as c from "./cli/colors.js";
import u from "ak-tools";
import Papa from "papaparse";

import gpt from "./components/openai.js";
import mixpanel from "./components/mixpanel.js";

const divider = `\n---------------------------------\n`.rainbow;

/**
 * do stuff
 * @param  {Types.Config | Object} config
 */
async function main(config) {
	let { format = ``, open_ai_key = ``, mixpanel_secret = ``, file = "" } = config;
	//if no file use args
	if (!file) file = process.argv[2];

	//check for open ai key + store
	if (!open_ai_key) open_ai_key = await getOpenAIKey();
	await storage.set(`open_ai_key`, open_ai_key);

	//check for mixpanel project secret + store
	if (!mixpanel_secret) mixpanel_secret = await getMixpanelProjectSecret();
	await storage.set(`mixpanel_secret`, mixpanel_secret);

	//check format + parse
	const sourceData = await getFormatAndDataAsJson(file, format);

	//these vars will be used in the feedback loop
	let transform = () => {};
	let transformAsText = ``;
	let log = ``;
	let shouldContinue = false;
	let userFeedback = ``;

	//feedback loop
	feedbackLoop: while (shouldContinue === false) {
		try {
			({ transform, log, transformAsText } = await haveGPTWriteTransform(
				sourceData,
				open_ai_key,
				transformAsText,
				userFeedback
			));
		} catch (e) {
			console.log(`ERROR: GPT failed to write valid javascript`.red);
			const { shouldContinue } = await inquirer.prompt([
				{
					type: `confirm`,
					name: `shouldContinue`,
					message: `Do you want to try again?`,
					default: true,
				},
			]);
			if (shouldContinue) {
				continue feedbackLoop;
			} else {
				console.log(`ok... bye!`.rainbow);
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
			console.log(divider);
			console.log(`ack...\n`);
			({ userFeedback } = await inquirer.prompt([
				{
					type: `input`,
					name: `userFeedback`,
					message: `Let me try again.. What is wrong with the transform? Be specific...\n`,
				},
			]));
		} else {
			console.log(divider);
			console.log(`👍 😎 👌` + `\tAWESOME!`.rainbow);
		}
	}

	//log
	await u.touch(`./tmp/log-${Date.now()}.txt`, log, false);

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
		const imported = await mixpanel(sourceData, config, transform);
		console.log(`\n\nRESULTS:`.cyan);
		console.log(u.json(imported));
		return imported;
	} else {
		console.log(`\n\nOK BYE!`.rainbow);
		process.exit(0);
	}
}

async function haveGPTWriteTransform(sourceData, open_ai_key, transFormAsText = ``, userFeedback = ``) {
	console.log(`\n\nCONSULTING 3.5 TURBO...`.cyan);
	const transformAsText = await gpt(sourceData[0], open_ai_key, transFormAsText, userFeedback);
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
	path;
	let parsedFile;
	//if no file, ask for it
	if (!file) {
		({ file } = await inquirer.prompt([
			{
				type: `input`,
				name: `file`,
				message: `What is the path to your data file?`,
			},
		]));

		//strip quotes from file
		file = file.replace(/"/g, "").replace(/'/g, "");
	}
	//if no format, try to guess based on file extension
	if (file && !format) {
		if (file.endsWith(".jsonl") || file.endsWith(".ndjson")) {
			format = "jsonl";
		} else if (file.endsWith(".json")) {
			format = "json";
		} else if (file.endsWith(".csv") || file.endsWith(".tsv")) {
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
		return process.env.OPEN_AI_KEY;
	}

	//then check storage
	const key_in_storage = await storage.get(`open_ai_key`);

	if (key_in_storage) {
		console.log(`\t...found OpenAI from storage`.yellow + `  👍`);
		process.env.OPEN_AI_KEY = key_in_storage;
		return key_in_storage;
	}
	console.log(`\t...didn't find it`.red + `  👎\n`);
	//then ask
	const { open_ai_key } = await inquirer.prompt([
		{
			type: `input`,
			name: `open_ai_key`,
			message: `What is your OpenAI key?`,
		},
	]);
	process.env.OPEN_AI_KEY = open_ai_key;
	return open_ai_key;
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
	return mixpanel_secret;
}

export default main;

if (esMain(import.meta)) {
	const params = cli();

	main(params)
		.then(() => {
			//noop
		})
		.catch((e) => {
			console.log(`\nuh oh! something didn't work...\nthe error message is:\n\n\t${e.message}\n\n`);
		})
		.finally(() => {
			console.log("\n\nhave a great day!\n\n");
			process.exit(0);
		});
}
