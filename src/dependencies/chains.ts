import config from "../config";
import ChainIds from "../usecases/schemas/blockchains";

const SUPPORTED_CHAINS: {
	[key in ChainIds]: {
		name: string;
		native: string;
		blockExplorer: string;
		rpcUrl: string;
	};
} = {
	[ChainIds.ARBITRUM]: {
		name: "Arbitrum",
		native: "ETH",
		blockExplorer: "https://arbiscan.io",
		rpcUrl: config.arbitrumRpc,
	},
	[ChainIds.OPTIMISM]: {
		name: "Optimism",
		native: "ETH",
		blockExplorer: "https://optimistic.etherscan.io",
		rpcUrl: config.optimismRpc,
	},
	[ChainIds.POLYGON]: {
		name: "Polygon",
		native: "MATIC",
		blockExplorer: "https://polygonscan.com",
		rpcUrl: config.polygonRpc,
	},
	[ChainIds.AVALANCHE]: {
		name: "Avalanche",
		native: "AVAX",
		blockExplorer: "https://snowtrace.io",
		rpcUrl: config.avalancheRpc,
	},
	[ChainIds.SEPOLIA]: {
		name: "Sepolia",
		native: "ETH",
		blockExplorer: "https://sepolia.etherscan.io",
		rpcUrl: config.sepoliaRpc,
	},
	[ChainIds.POLYGON_MUMBAI]: {
		name: "Polygon Mumbai",
		native: "MATIC",
		blockExplorer: "https://mumbai.polygonscan.com",
		rpcUrl: config.polygonMumbaiRpc,
	},
	[ChainIds.AVALANCHE_FUJI]: {
		name: "Avalanche Fuji",
		native: "AVAX",
		blockExplorer: "https://testnet.snowtrace.io/",
		rpcUrl: config.avalancheFujiRpc,
	},
};

export default SUPPORTED_CHAINS;
