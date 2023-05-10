#! /usr/bin/env node

import esMain from "es-main";
import * as dotenv from "dotenv";
import inquirer from "inquirer";
dotenv.config();

import cli from "./cli/cli.js";
import server from "./server/server.js";

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
	const { format = ``, open_ai_key = `` } = config;
	const sourceData = await getFormatAndDataAsJson(config, format);

	let transform = () => {};
	let log = ``;
	let shouldContinue = false;
	let userFeedback = ``;

	//end user feedback loop
	while (shouldContinue === false) {
		({ transform, log } = await haveGPTWriteTransform(sourceData, open_ai_key, userFeedback));
		console.log(divider);
		({ shouldContinue } = await inquirer.prompt([
			{
				type: `confirm`,
				name: `shouldContinue`,
				message: `Look at the transform ^^\nDoes this look correct?`,
				default: true,
			},
		]));
		if (shouldContinue === false) {
			console.log(divider);
			console.log(`ok... let's try again...`);
			({ userFeedback } = await inquirer.prompt([
				{
					type: `input`,
					name: `userFeedback`,
					message: `Let me try again.. What is wrong with the transform? Be specific...`,
				},
			]));
		} else {
			console.log(divider);
			console.log(`AWESOME! let's go!`);
		}
	}

	//log
	await u.touch(`./tmp/log-${Date.now()}.txt`, log, false);

	//data import
	const imported = await mixpanel(sourceData, config, transform);
	console.log(`\n\nRESULTS:`.yellow);
	console.log(u.json(imported));
	return imported;
}

async function haveGPTWriteTransform(sourceData, open_ai_key, userFeedback) {
	console.log("\n\nCONSULTING 3.5 TURBO...\n\n".cyan);
	const transformAsText = await gpt(sourceData[0], open_ai_key, userFeedback);
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

	return { transform, log };
}

async function getFormatAndDataAsJson(config, format) {
	const { file = "" } = config;
	let content;
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
		content = (await u.load(file)).split("\n").map(JSON.parse);
	}

	//json
	else if (file && ["json"].includes(format)) {
		content = await u.load(file, true);
	}

	//csv
	else if (file && ["csv", "tsv"].includes(format)) {
		const data = await u.load(file, false);
		const parsed = Papa.parse(data, {
			header: true,
			skipEmptyLines: true,
		}).data;
		content = parsed.map((obj) => {
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
	else if (Array.isArray(config)) {
		content = config;
	}

	//single object
	else if (typeof config === "object") {
		content = [config];
	} else {
		throw `unsupported format`;
	}

	return content;
}

export default main;

if (esMain(import.meta)) {
	if (process.argv.length == 2) {
		//no yargs... boot up UI
		server();
	} else {
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
}
