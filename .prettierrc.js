module.exports = {
	endOfLine: "lf",
	quoteProps: "as-needed",
	trailingComma: "es5",
	arrowParens: "always",
	bracketSameLine: false,
	bracketSpacing: true,
	singleQuote: false,
	printWidth: 80,
	tabWidth: 4,
	semi: true,
	useTabs: true,
	plugins: [],
	overrides: [
		{
			files: "*.yml",
			options: {
				singleQuote: false,
				tabWidth: 2,
			},
		},
	],
};
