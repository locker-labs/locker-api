import PercentSplitAutomationsGenerator from "../src/infrastructure/clients/PercentSplitAutomationsGenerator";
import {
	ETokenTxLockerDirection,
	TokenTx,
} from "../src/usecases/schemas/tokenTxs";

describe("PercentSplitAutomationsGenerator", () => {
	it("should not trigger automations for transactions out from the locker", async () => {
		const outTx: TokenTx = {
			lockerId: 123,
			lockerDirection: ETokenTxLockerDirection.OUT,
			contractAddress: "0x456",
			txHash: "0x789",
			tokenSymbol: "FOO",
			fromAddress: "0xabc",
			toAddress: "0xdef",
			tokenDecimals: 18,
			isConfirmed: true,
			amount: BigInt(1000),
			chainId: 1,
		};
		const generator = new PercentSplitAutomationsGenerator();
		const didAutomate = await generator.generateAutomations(outTx);
		expect(didAutomate).toBe(false);
	});
});

// if tx already done, nothing happens
