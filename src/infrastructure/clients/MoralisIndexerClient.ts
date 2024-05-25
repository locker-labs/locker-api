import { IWebhook } from "@moralisweb3/streams-typings";
import Moralis from "moralis";
import { zeroAddress } from "viem";
import web3 from "web3";

import config from "../../config";
import {
	Headers,
	IIndexerClient,
} from "../../usecases/interfaces/clients/indexer";
import { ILockerTokenBalance } from "../../usecases/schemas/lockers";
import { TokenTxInDb } from "../../usecases/schemas/tokenTxs";
import InvalidSignature from "./errors";

export default class MoralisIndexerClient implements IIndexerClient {
	constructor() {
		this.startClient();
	}

	public static groupTxsByChainAndToken(txs: TokenTxInDb[]): {
		[chainId: number]: TokenTxInDb[];
	} {
		const groupedTxs: { [chainId: string]: TokenTxInDb[] } = {};

		txs.forEach((tx) => {
			if (!groupedTxs[tx.chainId]) groupedTxs[tx.chainId] = [];
			groupedTxs[tx.chainId].push(tx);
		});

		return groupedTxs;
	}

	async moralisGetErc20BalanceByWallet(
		lockerAddress: `0x${string}`,
		chainId: number,
		txs: TokenTxInDb[]
	): Promise<ILockerTokenBalance[]> {
		try {
			const tokenAddresses = txs.map((tx) => tx.contractAddress);
			const moralisBalances =
				await Moralis.EvmApi.token.getWalletTokenBalances({
					chain: "0x1",
					tokenAddresses,
					address: lockerAddress,
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

			console.log(balances);
			return balances;
		} catch (e) {
			console.error(e);
		}

		return [];
	}

	async moralisGetEthBalanceByWallet(
		lockerAddress: `0x${string}`,
		chainId: number
	): Promise<ILockerTokenBalance[]> {
		try {
			const moralisBalance =
				await Moralis.EvmApi.balance.getNativeBalance({
					chain: "0x1",
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

			console.log(lockerTokenBalance);
			return [lockerTokenBalance];
		} catch (e) {
			console.error(e);
		}

		return [];
	}

	async getLockerTokenBalances({
		lockerAddress,
		txs,
	}: {
		lockerAddress: `0x${string}`;
		txs: TokenTxInDb[];
	}): Promise<ILockerTokenBalance[]> {
		// Get chainId-tokenAddress combinations
		const erc20TxsGroupedByChainAndToken =
			MoralisIndexerClient.groupTxsByChainAndToken(
				txs.filter((tx) => tx.contractAddress !== zeroAddress)
			);

		// For every chainId, get balance of all tokens
		// https://docs.moralis.io/web3-data-api/evm/reference/wallet-api/get-token-balances-by-wallet
		const erc20TokenBalancePromises = Object.keys(
			erc20TxsGroupedByChainAndToken
		).map(async (_chainId) => {
			const chainId = Number(_chainId);
			return this.moralisGetErc20BalanceByWallet(
				lockerAddress,
				Number(chainId),
				erc20TxsGroupedByChainAndToken[chainId]
			);
		});

		const ethTxsGroupedByChainAndToken =
			MoralisIndexerClient.groupTxsByChainAndToken(
				txs.filter((tx) => tx.contractAddress === zeroAddress)
			);

		// For every chainId, get balance of all tokens
		// https://docs.moralis.io/web3-data-api/evm/reference/wallet-api/get-token-balances-by-wallet
		const ethTokenBalancePromises = Object.keys(
			ethTxsGroupedByChainAndToken
		).map(async (_chainId) => {
			const chainId = Number(_chainId);
			return this.moralisGetEthBalanceByWallet(
				lockerAddress,
				Number(chainId)
			);
		});

		// adapt response to final format
		const groupedBalances = await Promise.all(
			erc20TokenBalancePromises.concat(ethTokenBalancePromises)
		);
		return groupedBalances.flat();
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
