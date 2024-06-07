const isTestEnv = (): boolean => process.env.NODE_ENV === "test";

const genRanHex = (size: number) =>
	[...Array(size)]
		.map(() => Math.floor(Math.random() * 16).toString(16))
		.join("");
// eslint-disable-next-line import/prefer-default-export
export { genRanHex, isTestEnv };
