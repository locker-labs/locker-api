import {
	arbitrum,
	arbitrumSepolia,
	avalanche,
	avalancheFuji,
	base,
	baseSepolia,
	Chain,
	optimism,
	optimismSepolia,
	polygon,
	sepolia,
} from "viem/chains";

import config from "../config";
import ChainIds from "../usecases/schemas/blockchains";

const ZERODEV_API_BASE = "https://rpc.zerodev.app/api/v2";
const getBundlerRpcUrl = (projectId: string) =>
	`${ZERODEV_API_BASE}/bundler/${projectId}`;
const getPaymasterRpcUrl = (projectId: string) =>
	`${ZERODEV_API_BASE}/paymaster/${projectId}`;

const SUPPORTED_CHAINS: {
	[chainId: string]: {
		name: string;
		native: string;
		blockExplorer: string;
		rpcUrl: string;
		bundlerRpcUrl: string;
		paymasterRpcUrl: string;
		viemChain: Chain;
		zerodevProjectId: string;
	};
} = {
	// Mainnets
	[ChainIds.ARBITRUM]: {
		name: "Arbitrum",
		native: "ETH",
		blockExplorer: "https://arbiscan.io",
		rpcUrl: config.arbitrumRpc,
		zerodevProjectId: config.arbitrumZerodevProjectId,
		bundlerRpcUrl: getBundlerRpcUrl(config.arbitrumZerodevProjectId),
		paymasterRpcUrl: getPaymasterRpcUrl(config.arbitrumZerodevProjectId),
		viemChain: arbitrum,
	},
	[ChainIds.AVALANCHE]: {
		name: "Avalanche",
		native: "AVAX",
		blockExplorer: "https://snowtrace.io",
		rpcUrl: config.avalancheRpc,
		zerodevProjectId: config.avalancheZerodevProjectId,
		bundlerRpcUrl: getBundlerRpcUrl(config.avalancheZerodevProjectId),
		paymasterRpcUrl: getPaymasterRpcUrl(config.avalancheZerodevProjectId),
		viemChain: avalanche,
	},
	[ChainIds.BASE]: {
		name: "Base",
		native: "ETH",
		blockExplorer: "https://basescan.org/",
		rpcUrl: config.baseRpc,
		zerodevProjectId: config.baseZerodevProjectId,
		bundlerRpcUrl: getBundlerRpcUrl(config.baseZerodevProjectId),
		paymasterRpcUrl: getPaymasterRpcUrl(config.baseZerodevProjectId),
		viemChain: base,
	},
	[ChainIds.OPTIMISM]: {
		name: "Optimism",
		native: "ETH",
		blockExplorer: "https://optimistic.etherscan.io",
		rpcUrl: config.optimismRpc,
		zerodevProjectId: config.optimismZerodevProjectId,
		bundlerRpcUrl: getBundlerRpcUrl(config.optimismZerodevProjectId),
		paymasterRpcUrl: getPaymasterRpcUrl(config.optimismZerodevProjectId),
		viemChain: optimism,
	},
	[ChainIds.POLYGON]: {
		name: "Polygon",
		native: "MATIC",
		blockExplorer: "https://polygonscan.com",
		rpcUrl: config.polygonRpc,
		zerodevProjectId: config.polygonZerodevProjectId,
		bundlerRpcUrl: getBundlerRpcUrl(config.polygonZerodevProjectId),
		paymasterRpcUrl: getPaymasterRpcUrl(config.polygonZerodevProjectId),
		viemChain: polygon,
	},

	// Testnets
	[ChainIds.ARBITRUM_SEPOLIA]: {
		name: "Arbitrum Sepolia",
		native: "ARB",
		blockExplorer: "https://sepolia-explorer.arbitrum.io",
		rpcUrl: config.arbitrumSepoliaRpc,
		zerodevProjectId: config.arbitrumSepoliaZerodevProjectId,
		bundlerRpcUrl: getBundlerRpcUrl(config.arbitrumSepoliaZerodevProjectId),
		paymasterRpcUrl: getPaymasterRpcUrl(
			config.arbitrumSepoliaZerodevProjectId
		),
		viemChain: arbitrumSepolia,
	},
	[ChainIds.AVALANCHE_FUJI]: {
		name: "Avalanche Fuji",
		native: "AVAX",
		blockExplorer: "https://testnet.snowtrace.io",
		rpcUrl: config.avalancheFujiRpc,
		zerodevProjectId: config.avalancheFujiZerodevProjectId,
		bundlerRpcUrl: getBundlerRpcUrl(config.avalancheFujiZerodevProjectId),
		paymasterRpcUrl: getPaymasterRpcUrl(
			config.avalancheFujiZerodevProjectId
		),
		viemChain: avalancheFuji,
	},
	[ChainIds.BASE_SEPOLIA]: {
		name: "Base Sepolia",
		native: "ETH",
		blockExplorer: "https://base-sepolia.blockscout.com",
		rpcUrl: config.baseSepoliaRpc,
		zerodevProjectId: config.baseSepoliaZerodevProjectId,
		bundlerRpcUrl: getBundlerRpcUrl(config.baseSepoliaZerodevProjectId),
		paymasterRpcUrl: getPaymasterRpcUrl(config.baseSepoliaZerodevProjectId),
		viemChain: baseSepolia,
	},
	[ChainIds.OPTIMISM_SEPOLIA]: {
		name: "Optimism Sepolia",
		native: "ETH",
		blockExplorer: "https://sepolia-optimism.etherscan.io",
		rpcUrl: config.optimismSepoliaRpc,
		zerodevProjectId: config.optimismSepoliaZerodevProjectId,
		bundlerRpcUrl: getBundlerRpcUrl(config.optimismSepoliaZerodevProjectId),
		paymasterRpcUrl: getPaymasterRpcUrl(
			config.optimismSepoliaZerodevProjectId
		),
		viemChain: optimismSepolia,
	},
	[ChainIds.SEPOLIA]: {
		name: "Sepolia",
		native: "ETH",
		blockExplorer: "https://sepolia.etherscan.io",
		rpcUrl: config.sepoliaRpc,
		zerodevProjectId: config.sepoliaZerodevProjectId,
		bundlerRpcUrl: getBundlerRpcUrl(config.sepoliaZerodevProjectId),
		paymasterRpcUrl: getPaymasterRpcUrl(config.sepoliaZerodevProjectId),
		viemChain: sepolia,
	},
};

export default SUPPORTED_CHAINS;
