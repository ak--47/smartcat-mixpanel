import Fastify from "fastify";
import { fastifyStatic } from "@fastify/static";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { version: VERSION } = require("../package.json");
// eslint-disable-next-line no-unused-vars
import * as c from "../cli/colors.js";

// ROUTES
import validate from "./routes/validate.js";

const app = Fastify({
	logger: {
		enabled: false,
		level: "info",
		timestamp: false,
	},
});

// STATIC ASSETS
app.register(fastifyStatic, { root: path.resolve("./html") });

// API ROUTES
app.register(validate);

/**
 * Run the server!
 */
async function start() {
	try {
		console.log(welcome);
		// console.log("APP ALIVE!");
		await app.listen({ port: 3000 });
	} catch (err) {
		console.log(`CRASH!\n\n${err.toString()}`);
		app.log.error(err);
		process.exit(1);
	}
}

export default start;

const hero = String.raw`
                                        888                     888    
                                        888                     888    
                                        888                     888    
.d8888b  88888b.d88b.   8888b.  888d888 888888 .d8888b  8888b.  888888 
88K      888 "888 "88b     "88b 888P"   888   d88P"        "88b 888    
"Y8888b. 888  888  888 .d888888 888     888   888      .d888888 888    
     X88 888  888  888 888  888 888     Y88b. Y88b.    888  888 Y88b.  
 88888P' 888  888  888 "Y888888 888      "Y888 "Y8888P "Y888888  "Y888`;

const cat =
	String.raw`                                                                                                                                                                                                
 /\_/\
( o.o )
 > ^ <
`.cyan;
const banner = `... "smart" import for mixpanel! (v${VERSION})
\tby AK (ak@mixpanel.com)\n\n`.green;

const instructions = `visit http://localhost:3000 in your browser to get started!\n\n`.yellow;

const welcome = hero.concat(cat).concat(banner).concat("\n").concat(instructions);
