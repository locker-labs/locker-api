import { zeroAddress } from "viem";

import MoralisClient from "../../../src/infrastructure/clients/moralis";
import { ILockerTokenBalance } from "../../../src/usecases/schemas/lockers";

describe("MoralisClient", () => {
	it("getLockerTokenBalances", async () => {
		const moralisClient = new MoralisClient();
		const balances = await moralisClient.getLockerTokenBalances({
			lockerAddress: "0xAF115955b028c145cE3A7367B25A274723C5104B",
		});

		expect(balances).toMatchObject([]);
	});

	it.skip("groupTxsByChainAndToken", async () => {
		const lockerAddress = "0xAF115955b028c145cE3A7367B25A274723C5104B";
		const moralisClient = new MoralisClient();

		const tokenBalances = await moralisClient.getLockerTokenBalances({
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
