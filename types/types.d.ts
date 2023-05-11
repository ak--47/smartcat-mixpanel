declare namespace Types {
	interface Params {
		file: string;
		format?: 'json' | 'jsonl' | 'csv' | 'tsv';
		mixpanel_id?: number;
		mixpanel_token?: string;
		mixpanel_secret?: string;
		openai_api_key?: string;
		
	}

	interface AnyProps {
		[key: string]: any;
	}

	export type Config = Params & AnyProps;
}
