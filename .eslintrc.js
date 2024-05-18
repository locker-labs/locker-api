module.exports = {
	root: true,
	parser: "@typescript-eslint/parser",
	parserOptions: {
		ecmaVersion: "latest",
		sourceType: "module",
	},
	settings: {
		"import/resolver": {
			node: {
				extensions: [".json", ".js", ".ts", ".d.ts"],
			},
			typescript: {
				alwaysTryTypes: true,
				project: "tsconfig.json",
			},
		},
		"import/parsers": {
			"@typescript-eslint/parser": [".ts"],
		},
	},
	extends: [
		"airbnb-base",
		"plugin:@typescript-eslint/recommended",
		"prettier",
	],
	plugins: ["prettier", "@typescript-eslint", "simple-import-sort"],
	env: {
		es2021: true,
		node: true,
		jest: true,
	},
	rules: {
		"no-console": ["warn"],
		"prettier/prettier": "error",
		"import/no-unresolved": "error",
		"simple-import-sort/imports": "error",
		"simple-import-sort/exports": "error",
		"no-shadow": "off",
		"@typescript-eslint/no-shadow": "error",
		"import/no-extraneous-dependencies": [
			"error",
			{ devDependencies: true },
		],
		"import/extensions": "off",
		"no-useless-constructor": "off",
		"no-underscore-dangle": "off",
		"class-methods-use-this": "off",
		radix: "off",
	},
	overrides: [
		{
			files: ["*.ts"],
			rules: {
				// Add or override TypeScript-specific rules here
			},
		},
	],
};
