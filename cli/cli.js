import yargs from "yargs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { name: NAME, version: VERSION } = require("../package.json");

/**
 * the CLI for putting the config in the command line
 * @return {Types.Config}
 */
function cli() {
	const args = yargs(process.argv.splice(2))
		.scriptName(NAME)
		.usage(
			`SMARTCAT${cat}\t... meow!

usage:
npx ${NAME} --yes [file or folder] [options]

DOCS: https://github.com/ak--47/snowcat-gpt`
		)
		.option("file", {
			demandOption: false,
			describe: "path to file",
			type: "string",
			alias: "f",
		})
		.option("format", {
			demandOption: false,
			describe: "json, jsonl, csv, or tsv",
			type: "string",
			alias: "t",
		})
		.option("mixpanel_id", {
			demandOption: false,
			alias: "project",
			describe: "mixpanel project id",
			type: "number",
		})
		.option("mixpanel_token", {
			demandOption: false,
			alias: "token",
			describe: "mixpanel project token",
			type: "string",
		})
		.option("mixpanel_secret", {
			demandOption: false,
			alias: "secret",
			describe: "mixpanel project secret",
			type: "string",
		})
		.option("open_ai_key", {
			demandOption: false,
			alias: "gtp",
			describe: "chat gpt api key",
			type: "string",
		})
		.option("clear", {
			demandOption: false,
			alias: "d",
			describe: "delete all stored data",
			type: "boolean",
			default: false,
		})

		.help().argv;

	console.log(welcome);
	// @ts-ignore
	return args;
}

export default cli;

const hero = String.raw`
                                        888                     888    
                                        888                     888    
                                        888                     888    
.d8888b  88888b.d88b.   8888b.  888d888 888888 .d8888b  8888b.  888888 
88K      888 "888 "88b     "88b 888P"   888   d88P"        "88b 888    
"Y8888b. 888  888  888 .d888888 888     888   888      .d888888 888    
     X88 888  888  888 888  888 888     Y88b. Y88b.    888  888 Y88b.  
 88888P' 888  888  888 "Y888888 888      "Y888 "Y8888P "Y888888  "Y888                                                                                                                                                                                                                      
`;

const cat = String.raw`                                                                                                                                                                                                
 /\_/\
( o.o )
 > ^ <
`;
const banner = `... "smart" import for mixpanel! (v${VERSION})
\tby AK (ak@mixpanel.com)\n\n`;

const welcome = hero.concat("\n").concat(banner);
