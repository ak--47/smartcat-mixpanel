import * as mp from "mixpanel-import";

async function main(config, data) {
	/** @type {import('mixpanel-import/types/types.js').Creds} */
	const creds = {
		token: "",
		secret: "",
		project: 0,
	};

	/** @type {import('mixpanel-import/types/types.js').Options} */
	const options = {
		abridged: false,
		fixData: true,
		recordType: "event",
		removeNulls: true,
		region: "US",
		streamFormat: "jsonl",
		strict: false,
		verbose: false,
		workers: 20,
		transformFunc: () => {},
		maxRetries: 100,
	};
	const result = await mp(creds, data, options);
	return result;
}

export default main;
