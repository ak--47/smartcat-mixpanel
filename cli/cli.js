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
			`${welcome}\n\nusage:\nnpx ${NAME} --yes [file or folder] [options]

examples:
npx  --yes  ${NAME} 
npx  --yes  ${NAME} 

DOCS: https://github.com/ak--47/`
		)
		.option("file", {
			demandOption: true,
			describe: "path to file",
			type: "string",
			alias: "f",
		})
		.option("format", {
			demandOption: false,
			describe: "json, jsonl, csv, or tsv",
			type: "string",
			alias: "t",
			default: "jsonl",
		})
		.option("project_id", {
			demandOption: false,
			alias: "project",
			describe: "mixpanel project id",
			type: "number",
		})
		.option("project_token", {
			demandOption: false,
			alias: "token",
			describe: "mixpanel project token",
			type: "string",
		})
		.option("project_secret", {
			demandOption: false,
			alias: "project",
			describe: "mixpanel project secret",
			type: "string",
		})
		.option("open_ai_key", {
			demandOption: false,
			alias: "gtp",
			describe: "chat gpt api key",
			type: "string",
		})

		.help().argv;

	// @ts-ignore
	return args;
}

export default cli;

const hero = String.raw`
COOL!
`;

const banner = `... tagline! (v${VERSION})
\tby AK (ak@mixpanel.com)\n\n`;

const welcome = hero.concat("\n").concat(banner);
