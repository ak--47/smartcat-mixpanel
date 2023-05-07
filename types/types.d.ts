declare namespace Types {
	interface Params {
		foo: string;
		bar: number;
		baz: boolean;
	}

	interface AnyProps {
		[key: string]: any;
	}

	export type Config = Params & AnyProps;
}
