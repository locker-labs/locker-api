import config from "../config";
import ChainIds from "../usecases/schemas/blockchains";

const ZERODEV_API_BASE = "https://rpc.zerodev.app/api/v2";

const getBundlerRpcUrl = (projectId: string) =>
	`${ZERODEV_API_BASE}/bundler/${projectId}`;
const getPaymasterRpcUrl = (projectId: string) =>
	`${ZERODEV_API_BASE}/paymaster/${projectId}`;

const FULLY_SUPPORTED_CHAINS: {
	[chainId: string]: {
		name: string;
		native: string;
		blockExplorer: string;
		rpcUrl: string;
		bundlerRpcUrl: string;
		paymasterRpcUrl: string;
	};
} = {
	// Mainnets
	[ChainIds.ARBITRUM]: {
		name: "Arbitrum",
		native: "ETH",
		blockExplorer: "https://arbiscan.io",
		rpcUrl: config.arbitrumRpc,
		bundlerRpcUrl: getBundlerRpcUrl(config.arbitrumZerodevProjectId),
		paymasterRpcUrl: getPaymasterRpcUrl(config.arbitrumZerodevProjectId),
	},
	[ChainIds.AVALANCHE]: {
		name: "Avalanche",
		native: "AVAX",
		blockExplorer: "https://snowtrace.io",
		rpcUrl: config.avalancheRpc,
		bundlerRpcUrl: getBundlerRpcUrl(config.arbitrumZerodevProjectId),
		paymasterRpcUrl: getPaymasterRpcUrl(config.arbitrumZerodevProjectId),
	},
	[ChainIds.BASE]: {
		name: "Avalanche",
		native: "AVAX",
		blockExplorer: "https://snowtrace.io",
		rpcUrl: config.avalancheRpc,
		bundlerRpcUrl: getBundlerRpcUrl(config.avalancheZerodevProjectId),
		paymasterRpcUrl: getPaymasterRpcUrl(config.avalancheZerodevProjectId),
	},
	[ChainIds.OPTIMISM]: {
		name: "Optimism",
		native: "ETH",
		blockExplorer: "https://optimistic.etherscan.io",
		rpcUrl: config.optimismRpc,
		bundlerRpcUrl: getBundlerRpcUrl(config.optimismZerodevProjectId),
		paymasterRpcUrl: getPaymasterRpcUrl(config.optimismZerodevProjectId),
	},
	[ChainIds.POLYGON]: {
		name: "Polygon",
		native: "MATIC",
		blockExplorer: "https://polygonscan.com",
		rpcUrl: config.polygonRpc,
		bundlerRpcUrl: getBundlerRpcUrl(config.polygonZerodevProjectId),
		paymasterRpcUrl: getPaymasterRpcUrl(config.polygonZerodevProjectId),
	},

	// Testnets
	[ChainIds.ARBITRUM_SEPOLIA]: {
		name: "Arbitrum Sepolia",
		native: "ARB",
		blockExplorer: "https://sepolia-explorer.arbitrum.io",
		rpcUrl: config.arbitrumSepoliaRpc,
		bundlerRpcUrl: getBundlerRpcUrl(config.arbitrumSepoliaZerodevProjectId),
		paymasterRpcUrl: getPaymasterRpcUrl(
			config.arbitrumSepoliaZerodevProjectId
		),
	},
	[ChainIds.AVALANCHE_FUJI]: {
		name: "Avalanche Fuji",
		native: "AVAX",
		blockExplorer: "https://testnet.snowtrace.io",
		rpcUrl: config.avalancheFujiRpc,
		bundlerRpcUrl: getBundlerRpcUrl(config.avalancheFujiZerodevProjectId),
		paymasterRpcUrl: getPaymasterRpcUrl(
			config.avalancheFujiZerodevProjectId
		),
	},
	[ChainIds.BASE_SEPOLIA]: {
		name: "Base Sepolia",
		native: "ETH",
		blockExplorer: "https://base-sepolia.blockscout.com",
		rpcUrl: config.baseSepoliaRpc,
		bundlerRpcUrl: getBundlerRpcUrl(config.baseSepoliaZerodevProjectId),
		paymasterRpcUrl: getPaymasterRpcUrl(config.baseSepoliaZerodevProjectId),
	},
	[ChainIds.OPTIMISM_SEPOLIA]: {
		name: "Optimism Sepolia",
		native: "ETH",
		blockExplorer: "https://sepolia-optimism.etherscan.io",
		rpcUrl: config.optimismSepoliaRpc,
		bundlerRpcUrl: getBundlerRpcUrl(config.optimismSepoliaZerodevProjectId),
		paymasterRpcUrl: getPaymasterRpcUrl(
			config.optimismSepoliaZerodevProjectId
		),
	},
	[ChainIds.SEPOLIA]: {
		name: "Sepolia",
		native: "ETH",
		blockExplorer: "https://sepolia.etherscan.io",
		rpcUrl: config.sepoliaRpc,
		bundlerRpcUrl: getBundlerRpcUrl(config.sepoliaZerodevProjectId),
		paymasterRpcUrl: getPaymasterRpcUrl(config.sepoliaZerodevProjectId),
	},

	// [ChainIds.POLYGON_MUMBAI]: {
	// 	name: "Polygon Mumbai",
	// 	native: "MATIC",
	// 	blockExplorer: "https://mumbai.polygonscan.com",
	// 	rpcUrl: config.polygonMumbaiRpc,
	// },
};

export default FULLY_SUPPORTED_CHAINS;
