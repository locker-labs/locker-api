import MoralisClient from "../../../src/infrastructure/clients/moralis";

describe.skip("MoralisClient", () => {
	it("getLockerTokenBalances", async () => {
		const moralisClient = new MoralisClient();
		const balances = await moralisClient.getLockerTokenBalances({
			lockerAddress: "0x3abb17dd306cba6d4ccad0bbd880d0cbd0a2cdaa",
		});

		expect(balances).toMatchObject([]);
	});
});
