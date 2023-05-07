#! /usr/bin/env node

import esMain from "es-main";
import * as dotenv from "dotenv";
dotenv.config();

import cli from "./cli/cli.js";
import server from "./server/server.js";

// eslint-disable-next-line no-unused-vars
import * as c from "./cli/colors.js";
// eslint-disable-next-line no-unused-vars
import u from "ak-tools";

import gpt from "./components/openai.js";
import mixpanel from "./components/mixpanel.js";

/**
 * do stuff
 * @param  {Types.Config} config
 */
async function main(config) {
	const {
		file,
		format,
		open_ai_key,
		project_id,
		project_secret,
		project_token,
		uuidKey,
	} = config;

	const content = await u.load(file, true);
	const transformAsText = await gpt(content[0], uuidKey);
	let transform;
	eval(`transform = ${transformAsText}`);
	console.log(u.json(content.map(transform)));

	return config;
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
				console.log(
					`\nuh oh! something didn't work...\nthe error message is:\n\n\t${e.message}\n\n`
				);
			})
			.finally(() => {
				console.log("\n\nhave a great day!\n\n");
				process.exit(0);
			});
	}
}
