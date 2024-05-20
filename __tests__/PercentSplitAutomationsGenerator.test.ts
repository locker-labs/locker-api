import PercentSplitAutomationsGenerator from "../src/infrastructure/clients/PercentSplitAutomationsGenerator";
import { IAutomation } from "../src/usecases/schemas/policies";
import {
	ETokenTxAutomationsState,
	ETokenTxLockerDirection,
	TokenTxInDb,
} from "../src/usecases/schemas/tokenTxs";
import TestPolicyApi from "./utils/TestPolicyApi";
import TestTokenTxApi from "./utils/TestTokenTxApi";

const testPolicyApi = new TestPolicyApi();
const testTokenTxApi = new TestTokenTxApi();

describe("PercentSplitAutomationsGenerator", () => {
	it("should not trigger automations for transactions out from the locker", async () => {
		const outTx: TokenTxInDb = {
			id: 1,
			createdAt: new Date(),
			updatedAt: new Date(),
			lockerId: 123,
			lockerDirection: ETokenTxLockerDirection.OUT,
			automationsState: ETokenTxAutomationsState.NOT_STARTED,
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
		const generator = new PercentSplitAutomationsGenerator(
			testPolicyApi,
			testTokenTxApi
		);
		const didAutomate = await generator.shouldGenerateAutomations(outTx);
		expect(didAutomate).toBe(false);
	});

	it("should not trigger automations for transactions that have already generated automations", async () => {
		const outTx: TokenTxInDb = {
			id: 1,
			createdAt: new Date(),
			updatedAt: new Date(),
			lockerId: 123,
			lockerDirection: ETokenTxLockerDirection.IN,
			automationsState: ETokenTxAutomationsState.STARTED,
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
		const generator = new PercentSplitAutomationsGenerator(
			testPolicyApi,
			testTokenTxApi
		);
		const didAutomate = await generator.shouldGenerateAutomations(outTx);
		expect(didAutomate).toBe(false);
	});

	it("should not trigger automations for transactions have not yet been confirmed", async () => {
		const outTx: TokenTxInDb = {
			id: 1,
			createdAt: new Date(),
			updatedAt: new Date(),
			lockerId: 123,
			lockerDirection: ETokenTxLockerDirection.IN,
			automationsState: ETokenTxAutomationsState.NOT_STARTED,
			contractAddress: "0x456",
			txHash: "0x789",
			tokenSymbol: "FOO",
			fromAddress: "0xabc",
			toAddress: "0xdef",
			tokenDecimals: 18,
			isConfirmed: false,
			amount: BigInt(1000),
			chainId: 1,
		};
		const generator = new PercentSplitAutomationsGenerator(
			testPolicyApi,
			testTokenTxApi
		);
		const didAutomate = await generator.shouldGenerateAutomations(outTx);
		expect(didAutomate).toBe(false);
	});

	it("should not trigger automations if session key not yet generated", async () => {
		const outTx: TokenTxInDb = {
			id: 1,
			createdAt: new Date(),
			updatedAt: new Date(),
			lockerId: 123,
			lockerDirection: ETokenTxLockerDirection.IN,
			automationsState: ETokenTxAutomationsState.NOT_STARTED,
			contractAddress: "0x456",
			txHash: "0x789",
			tokenSymbol: "FOO",
			fromAddress: "0xabc",
			toAddress: "0xdef",
			tokenDecimals: 18,
			isConfirmed: false,
			amount: BigInt(1000),
			chainId: 1,
		};
		const generator = new PercentSplitAutomationsGenerator(
			testPolicyApi,
			testTokenTxApi
		);
		const didAutomate = await generator.shouldGenerateAutomations(outTx);
		expect(didAutomate).toBe(false);
	});

	it("should trigger automations for confirmed deposits if not previously started and session key generated.", async () => {
		const outTx: TokenTxInDb = {
			id: 1,
			createdAt: new Date(),
			updatedAt: new Date(),
			lockerId: 123,
			lockerDirection: ETokenTxLockerDirection.IN,
			automationsState: ETokenTxAutomationsState.NOT_STARTED,
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
		const generator = new PercentSplitAutomationsGenerator(
			testPolicyApi,
			testTokenTxApi
		);
		const didAutomate = await generator.shouldGenerateAutomations(outTx);
		expect(didAutomate).toBe(true);
	});

	it("should not do anything when spawning automation for savings", async () => {
		const outTx: TokenTxInDb = {
			id: 1,
			createdAt: new Date(),
			updatedAt: new Date(),
			lockerId: 123,
			lockerDirection: ETokenTxLockerDirection.IN,
			automationsState: ETokenTxAutomationsState.NOT_STARTED,
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

		const automation: IAutomation = {
			type: "savings",
			allocation: 0.1,
			status: "ready",
		};

		const generator = new PercentSplitAutomationsGenerator(
			testPolicyApi,
			testTokenTxApi
		);

		const spawnedAutomation = await generator.spawnAutomation(
			outTx,
			automation
		);
		expect(spawnedAutomation).toBeNull();
	});

	it("should not do anything if status is not ready", async () => {
		const outTx: TokenTxInDb = {
			id: 1,
			createdAt: new Date(),
			updatedAt: new Date(),
			lockerId: 123,
			lockerDirection: ETokenTxLockerDirection.IN,
			automationsState: ETokenTxAutomationsState.NOT_STARTED,
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

		const automation: IAutomation = {
			type: "forward_to",
			allocation: 0.1,
			status: "new",
		};

		const generator = new PercentSplitAutomationsGenerator(
			testPolicyApi,
			testTokenTxApi
		);

		const spawnedAutomation = await generator.spawnAutomation(
			outTx,
			automation
		);
		expect(spawnedAutomation).toBeNull();
	});

	it("should transfer ERC20 funds to recipient if forward_to or off_ramp", async () => {
		const outTx: TokenTxInDb = {
			id: 1,
			createdAt: new Date(),
			updatedAt: new Date(),
			lockerId: 123,
			lockerDirection: ETokenTxLockerDirection.IN,
			automationsState: ETokenTxAutomationsState.NOT_STARTED,
			contractAddress: "0x456",
			txHash: "0x789",
			tokenSymbol: "FOO",
			fromAddress: "0xabc",
			toAddress: "0xdef",
			tokenDecimals: 18,
			isConfirmed: true,
			amount: BigInt(1000),
			chainId: 11155111,
		};

		const automation: IAutomation = {
			type: "forward_to",
			allocation: 0.1,
			status: "ready",
			recipientAddress: "0x111",
		};

		const generator = new PercentSplitAutomationsGenerator(
			testPolicyApi,
			testTokenTxApi
		);

		const spawnedAutomation = await generator.spawnAutomation(
			outTx,
			automation
		);

		const expectedTx = {
			lockerId: 123,
			lockerDirection: ETokenTxLockerDirection.OUT,
			automationsState: ETokenTxAutomationsState.STARTED,
			contractAddress: "0x456",
			txHash: "0x222",
			tokenSymbol: "FOO",
			// the locker itself
			fromAddress: "0xabc",
			// automation recipient
			toAddress: "0x111",
			tokenDecimals: 18,
			isConfirmed: false,
			// 10% of amount received
			amount: BigInt(100),
			chainId: 11155111,
		};

		expect(spawnedAutomation).toMatchObject(expectedTx);
	});

	// should transfer ETH funds to recipient if forward_to or off_ramp
});
