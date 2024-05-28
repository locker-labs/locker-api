import { IWebhook } from "@moralisweb3/streams-typings";
import Moralis from "moralis";
import { numberToHex, zeroAddress } from "viem";
import web3 from "web3";

import config from "../../config";
import SUPPORTED_CHAINS from "../../dependencies/chains";
import { logger } from "../../dependencies/logger";
import {
	Headers,
	IIndexerClient,
} from "../../usecases/interfaces/clients/indexer";
import { ILockerTokenBalance } from "../../usecases/schemas/lockers";
import InvalidSignature from "./errors";

const chainIds: number[] = Object.keys(SUPPORTED_CHAINS).map((key) =>
	Number(key)
);
// const chainIds: number[] = [
// 	ChainIds.ARBITRUM,
// 	ChainIds.AVALANCHE,
// 	ChainIds.BASE,
// 	ChainIds.OPTIMISM,
// 	ChainIds.POLYGON,
// 	ChainIds.SEPOLIA,
// ];

export default class MoralisClient implements IIndexerClient {
	constructor() {
		this.startClient();
	}

	async moralisGetErc20BalanceByWallet(
		lockerAddress: `0x${string}`,
		chainId: number
	): Promise<ILockerTokenBalance[]> {
		try {
			const chainIdHex = numberToHex(chainId);
			const moralisBalances =
				await Moralis.EvmApi.token.getWalletTokenBalances({
					chain: chainIdHex,
					address: lockerAddress,
					excludeSpam: true,
				});

			const balances = moralisBalances.toJSON().map((moralisBalance) => {
				const {
					symbol,
					token_address: address,
					decimals,
					balance,
				} = moralisBalance;

				return {
					symbol,
					address,
					decimals,
					chainId,
					balance,
				} as ILockerTokenBalance;
			});

			return balances;
		} catch (e) {
			logger.error(e);
		}

		return [];
	}

	async moralisGetEthBalanceByWallet(
		lockerAddress: `0x${string}`,
		chainId: number
	): Promise<ILockerTokenBalance[]> {
		try {
			const chainIdHex = numberToHex(chainId);
			const moralisBalance =
				await Moralis.EvmApi.balance.getNativeBalance({
					chain: chainIdHex,
					address: lockerAddress,
				});

			const { balance } = moralisBalance.toJSON();

			const lockerTokenBalance = {
				symbol: "ETH",
				address: zeroAddress,
				decimals: 18,
				chainId,
				balance,
			} as ILockerTokenBalance;

			return [lockerTokenBalance];
		} catch (e) {
			logger.error(e);
		}

		return [];
	}

	async getLockerTokenBalances({
		lockerAddress,
	}: {
		lockerAddress: `0x${string}`;
	}): Promise<ILockerTokenBalance[]> {
		// For every chainId, get balance of all tokens
		// https://docs.moralis.io/web3-data-api/evm/reference/wallet-api/get-token-balances-by-wallet
		const erc20TokenBalancePromises = chainIds.map(async (chainId) =>
			this.moralisGetErc20BalanceByWallet(lockerAddress, chainId)
		);

		// For every chainId, get balance of all tokens
		// https://docs.moralis.io/web3-data-api/evm/reference/wallet-api/get-token-balances-by-wallet
		const ethTokenBalancePromises = chainIds.map(async (chainId) =>
			this.moralisGetEthBalanceByWallet(lockerAddress, chainId)
		);

		// adapt response to final format
		const groupedBalances = await Promise.all(
			erc20TokenBalancePromises.concat(ethTokenBalancePromises)
		);
		return groupedBalances
			.flat()
			.filter((balance) => Number(balance.balance) > 0);
	}

	async startClient(): Promise<void> {
		await Moralis.start({
			apiKey: config.moralisApiKey,
		});
	}

	async watchOnChain(address: `0x${string}`): Promise<void> {
		await Moralis.Streams.addAddress({
			id: config.moralisStreamId,
			address: [address],
		});
	}

	async verifyWebhook(body: IWebhook, headers: Headers): Promise<void> {
		const providedSignature = headers["x-signature"];
		if (!providedSignature) {
			throw new InvalidSignature("Signature not provided.");
		}

		const generatedSignature = web3.utils.sha3(
			JSON.stringify(body) + config.moralisStreamSecret
		);

		if (generatedSignature !== providedSignature)
			throw new InvalidSignature("The webhook signature is invalid.");
	}
}
