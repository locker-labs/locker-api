import type { Config } from "jest";

const config: Config = {
	verbose: true,
	testEnvironment: "node",
	modulePathIgnorePatterns: ["__tests__/utils/"],
};

export default config;
