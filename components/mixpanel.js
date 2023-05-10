import mp from "mixpanel-import";
import * as dotenv from "dotenv";
dotenv.config();

/**
 * @param  {Types.Config} config
 * @returns  {Promise<import('mixpanel-import/types/types.d.ts').ImportResults>}
 */
async function main(data, config, transform) {
	const { project_id, project_secret, project_token } = config;
	/** @type {import('mixpanel-import/types/types.js').Creds} */
	const creds = {
		token: project_token || process.env.MIXPANEL_TOKEN,
		secret: project_secret || process.env.MIXPANEL_SECRET,
		project: project_id || process.env.MIXPANEL_PROJECT_ID,
	};

	/** @type {import('mixpanel-import/types/types.js').Options} */
	const options = {
		abridged: false,
		fixData: true,
		recordType: "event",
		removeNulls: true,
		region: "US",
		streamFormat: "json",
		strict: false,
		verbose: false,
		workers: 20,
		// @ts-ignore
		transformFunc: transform,
		maxRetries: 100,
	};
	const summary = await mp(creds, data, options);
	return summary;
}

export default main;
