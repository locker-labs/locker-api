import { zeroAddress } from "viem";

import MoralisClient from "../../../src/infrastructure/clients/moralis";
import { ILockerTokenBalance } from "../../../src/usecases/schemas/lockers";
import {
	ETokenTxAutomationsState,
	ETokenTxLockerDirection,
	TokenTxInDb,
} from "../../../src/usecases/schemas/tokenTxs";

describe("MoralisClient", () => {
	it.skip("getLockerTokenBalances", async () => {
		const moralisClient = new MoralisClient();
		const balances = await moralisClient.getLockerTokenBalances({
			lockerAddress: "0x3abb17dd306cba6d4ccad0bbd880d0cbd0a2cdaa",
		});

		expect(balances).toMatchObject([]);
	});

	it.skip("groupTxsByChainAndToken", async () => {
		const lockerAddress = "0xAF115955b028c145cE3A7367B25A274723C5104B";
		const moralisClient = new MoralisClient();

		const txs: TokenTxInDb[] = [
			{
				id: 1,
				createdAt: new Date(),
				updatedAt: new Date(),
				lockerId: 123,
				lockerDirection: ETokenTxLockerDirection.IN,
				automationsState: ETokenTxAutomationsState.NOT_STARTED,
				contractAddress: zeroAddress,
				txHash: "0x789",
				tokenSymbol: "FOO",
				fromAddress: "0xabc",
				toAddress: "0xdef",
				tokenDecimals: 18,
				isConfirmed: true,
				amount: BigInt(1000),
				chainId: 1,
			},
			{
				id: 1,
				createdAt: new Date(),
				updatedAt: new Date(),
				lockerId: 123,
				lockerDirection: ETokenTxLockerDirection.IN,
				automationsState: ETokenTxAutomationsState.NOT_STARTED,
				// USDC
				contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
				txHash: "0x789",
				tokenSymbol: "FOO",
				fromAddress: "0xabc",
				toAddress: "0xdef",
				tokenDecimals: 18,
				isConfirmed: true,
				amount: BigInt(1000),
				chainId: 1,
			},
		];

		const tokenBalances = await moralisClient.getLockerTokenBalances({
			txs,
			lockerAddress,
		});

		const expectedTokenBalances: ILockerTokenBalance[] = [
			{
				symbol: "USDC",
				address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
				decimals: 6,
				chainId: 1,
				balance: "29000000",
			},
			{
				symbol: "ETH",
				address: zeroAddress,
				decimals: 18,
				chainId: 1,
				balance: "31259748949670848",
			},
		];

		expect(tokenBalances).toMatchObject(expectedTokenBalances);
	});
});
