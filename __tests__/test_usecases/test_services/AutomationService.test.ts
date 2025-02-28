import { LockerInDb } from "../../../src/usecases/schemas/lockers";
import {
	EAutomationStatus,
	EAutomationType,
	IAutomation,
} from "../../../src/usecases/schemas/policies";
import {
	ETokenTxAutomationsState,
	ETokenTxLockerDirection,
	TokenTxInDb,
} from "../../../src/usecases/schemas/tokenTxs";
import AutomationService from "../../../src/usecases/services/automation";
import TestCallDataExecutor from "../../utils/TestCallDataExecutor";
import TestLockerApi from "../../utils/TestLockerApi";
import TestPolicyApi from "../../utils/TestPolicyApi";
import TestTokenTxApi from "../../utils/TestTokenTxApi";
import TestOffRampRepo from "../../utils/TestOffRampRepo";

const testPolicyApi = new TestPolicyApi();
const testTokenTxApi = new TestTokenTxApi();
const testCallDataExecutor = new TestCallDataExecutor();
const testLockerApi = new TestLockerApi();
const testOffRampRepo = new TestOffRampRepo();

describe("AutomationService", () => {
	const locker: LockerInDb = {
		userId: "12",
		seed: 1,
		provider: "test",
		ownerAddress: "0xll2",
		address: "0xll1",
		id: 0,
		createdAt: new Date(),
		updatedAt: new Date(),
		deployments: [],
	};

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
			amount: "1000",
			chainId: 1,
		};
		const generator = new AutomationService(
			testPolicyApi,
			testTokenTxApi,
			testLockerApi,
			testOffRampRepo,
			testCallDataExecutor
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
			amount: "1000",
			chainId: 1,
		};
		const generator = new AutomationService(
			testPolicyApi,
			testTokenTxApi,
			testLockerApi,
			testOffRampRepo,
			testCallDataExecutor
		);
		const didAutomate = await generator.shouldGenerateAutomations(outTx);
		expect(didAutomate).toBe(false);
	});

	it.skip("should not trigger automations for transactions have not yet been confirmed", async () => {
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
			amount: "1000",
			chainId: 1,
		};
		const generator = new AutomationService(
			testPolicyApi,
			testTokenTxApi,
			testLockerApi,
			testOffRampRepo,
			testCallDataExecutor
		);
		const didAutomate = await generator.shouldGenerateAutomations(outTx);
		expect(didAutomate).toBe(false);
	});

	it.skip("should not trigger automations if session key not yet generated", async () => {
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
			amount: "1000",
			chainId: 1,
		};
		const generator = new AutomationService(
			testPolicyApi,
			testTokenTxApi,
			testLockerApi,
			testOffRampRepo,
			testCallDataExecutor
		);
		const didAutomate = await generator.shouldGenerateAutomations(outTx);
		expect(didAutomate).toBe(false);
	});

	it.skip("should trigger automations for confirmed deposits if not previously started and session key generated.", async () => {
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
			amount: "1000",
			chainId: 1,
		};
		const generator = new AutomationService(
			testPolicyApi,
			testTokenTxApi,
			testLockerApi,
			testOffRampRepo,
			testCallDataExecutor
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
			amount: "1000",
			chainId: 1,
		};

		const automation: IAutomation = {
			type: EAutomationType.SAVINGS,
			allocation: 0.1,
			status: EAutomationStatus.READY,
		};

		const generator = new AutomationService(
			testPolicyApi,
			testTokenTxApi,
			testLockerApi,
			testOffRampRepo,
			testCallDataExecutor
		);

		const policy = {
			lockerId: 123,
			chainId: 1,
			encryptedSessionKey: "",
			encodedIv: "",
			automations: [],
		};

		const spawnedAutomation = await generator.spawnAutomation(
			outTx,
			automation,
			policy,
			locker
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
			amount: "1000",
			chainId: 1,
		};

		const automation: IAutomation = {
			type: EAutomationType.FORWARD_TO,
			allocation: 0.1,
			status: EAutomationStatus.NEW,
		};

		const policy = {
			lockerId: 123,
			chainId: 1,
			encryptedSessionKey: "",
			encodedIv: "",
			automations: [],
		};

		const generator = new AutomationService(
			testPolicyApi,
			testTokenTxApi,
			testLockerApi,
			testOffRampRepo,
			testCallDataExecutor
		);

		const spawnedAutomation = await generator.spawnAutomation(
			outTx,
			automation,
			policy,
			locker
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
			amount: "1000",
			chainId: 11155111,
		};

		const automation: IAutomation = {
			type: EAutomationType.FORWARD_TO,
			allocation: 0.1,
			status: EAutomationStatus.READY,
			recipientAddress: "0xF445b07Aad98De9cc2794593B68ecD4aa5f81076",
		};

		const generator = new AutomationService(
			testPolicyApi,
			testTokenTxApi,
			testLockerApi,
			testOffRampRepo,
			testCallDataExecutor
		);

		const policy = {
			lockerId: 123,
			chainId: 1,
			encryptedSessionKey: "",
			encodedIv: "",
			automations: [],
		};

		const spawnedAutomation = await generator.spawnAutomation(
			outTx,
			automation,
			policy,
			locker
		);

		const expectedTx = {
			lockerId: 123,
			lockerDirection: ETokenTxLockerDirection.OUT,
			automationsState: ETokenTxAutomationsState.STARTED,
			contractAddress: "0x456",
			tokenSymbol: "FOO",
			// the locker itself
			fromAddress: locker.address,
			// automation recipient
			toAddress: "0xF445b07Aad98De9cc2794593B68ecD4aa5f81076",
			tokenDecimals: 18,
			isConfirmed: false,
			// 10% of amount received
			amount: "100",
			chainId: 11155111,
		};

		expect(spawnedAutomation).toMatchObject(expectedTx);
	});

	// should transfer ETH funds to recipient if forward_to or off_ramp
});
