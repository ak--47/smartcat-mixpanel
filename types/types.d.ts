declare namespace Types {
	interface Params {
		file: string;
		format?: 'json' | 'jsonl' | 'csv' | 'tsv';
		project_id?: number;
		project_token?: string;
		project_secret?: string;
		open_ai_key?: string;
		
	}

	interface AnyProps {
		[key: string]: any;
	}

	export type Config = Params & AnyProps;
}
