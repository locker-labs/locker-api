import config from "../config";
import ChainIds from "../usecases/schemas/blockchains";

const SUPPORTED_CHAINS: {
	[key in ChainIds]: { name: string; blockExplorer: string; rpcUrl: string };
} = {
	[ChainIds.ARBITRUM]: {
		name: "Arbitrum",
		blockExplorer: "https://arbiscan.io",
		rpcUrl: config.arbitrumRpc,
	},
	[ChainIds.OPTIMISM]: {
		name: "Optimism",
		blockExplorer: "https://optimistic.etherscan.io",
		rpcUrl: config.optimismRpc,
	},
	[ChainIds.POLYGON]: {
		name: "Polygon",
		blockExplorer: "https://polygonscan.com",
		rpcUrl: config.polygonRpc,
	},
	[ChainIds.AVALANCHE]: {
		name: "Avalanche",
		blockExplorer: "https://snowtrace.io/",
		rpcUrl: config.avalancheRpc,
	},
	[ChainIds.SEPOLIA]: {
		name: "Sepolia",
		blockExplorer: "https://sepolia.etherscan.io",
		rpcUrl: config.sepoliaRpc,
	},
};

export default SUPPORTED_CHAINS;
