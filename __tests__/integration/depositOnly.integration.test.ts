import {
	getLockersRepo,
	getPoliciesRepo,
	getTokenTxsRepo,
	logger,
} from "../../src/dependencies";
import express from "express";
import moralisRouter from "../../src/infrastructure/web/endpoints/integrations/moralis";
import crypto from "crypto";
import request from "supertest";
import { generatePrivateKey } from "viem/accounts";
import { privateKeyToAccount } from "viem/accounts";
import tokentxsDbHookRouter from "../../src/infrastructure/web/endpoints/db-hooks/tokentxs";
import {
	ETokenTxAutomationsState,
	ETokenTxLockerDirection,
} from "../../src/usecases/schemas/tokenTxs";
import policiesDbHookRouter from "../../src/infrastructure/web/endpoints/db-hooks/policies";
import {
	EAutomationStatus,
	EAutomationType,
	PolicyInDb,
} from "../../src/usecases/schemas/policies";
import getOrCreateDatabase from "../../src/infrastructure/db/connect";
import { policies } from "../../src/infrastructure/db/models";
import { genRanHex } from "../../src/dependencies/environment";

describe.skip("User deposits into locker, then policy is created", () => {
	/**
	 * 1. New locker created
	 * 2. User deposits into locker, triggering Moralis
	 * 3. Moralis webhook creates a transaction, triggering db-hook
	 * -------- Assert NO automations are triggered ------
	 * 4. Deposit is finalized on-chain, triggering Moralis
	 * 5. Moralis webhook creates a transaction, triggering db-hook
	 * -------- Assert NO automations are triggered ------
	 * 6. Policy is created, triggering db-hook
	 * -------- Assert automations ARE triggered ------
	 * 7. Send moralis webhook for automated tx pending
	 * -------- Assert automation in confirmed state with correct sender/recipient ------
	 * 8. Send moralis webhook for automated tx confirmed
	 * -------- Assert automation in confirmed state ------
	 */
	it("does not trigger automations for deposit without policy", async () => {
		const app = express();
		app.use("/integrations/moralis", moralisRouter);
		app.use("/db-hooks/tokentxs", tokentxsDbHookRouter);
		app.use("/db-hooks/policies", policiesDbHookRouter);

		const ownerKey = generatePrivateKey();
		const ownerWallet = privateKeyToAccount(ownerKey);
		const lockerKey = generatePrivateKey();
		const lockerWallet = privateKeyToAccount(lockerKey);

		const db = getOrCreateDatabase(logger);
		await db.delete(policies);

		// 1. create a locker with a new random address
		const lockersDb = await getLockersRepo();
		const locker = await lockersDb.create({
			userId: crypto.randomUUID(),
			seed: 69,
			provider: "test",
			ownerAddress: ownerWallet.address,
			address: lockerWallet.address,
		});

		const txHash = genRanHex(64);

		const unconfirmedDeposit = {
			confirmed: false,
			chainId: "0xaa36a7",
			abi: [
				{
					name: "Transfer",
					type: "event",
					anonymous: false,
				},
			],
			streamId: "0755a037-14fa-49b5-bbfb-fc0229743c6d",
			tag: "dev",
			retries: 0,
			block: {
				number: "6048367",
				hash: "0xdb0f452cd6b2bfabc2342d40618ed573d0a1cba3ce20862f3a42d73aac50a1e1",
				timestamp: "1717641732",
			},
			logs: [
				{
					logIndex: "17",
					transactionHash: txHash,
					address: "0x1c7d4b196cb07b01d743fbc6116a902379c7238",
					data: "0x00000000000000000000000000000000000000000000000000000000000003e8",
					topic0: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
					topic1: "0x000000000000000000000000af115955b028c145ce3a7367b25a274723c5104b",
					topic2: "0x000000000000000000000000ba2d295561404fd553ff228f792b050aafdf214c",
					topic3: null,
				},
			],
			txs: [
				{
					hash: txHash,
					gas: "68140",
					gasPrice: "3286444411",
					nonce: "6",
					input: "0xa9059cbb000000000000000000000000ba2d295561404fd553ff228f792b050aafdf214c00000000000000000000000000000000000000000000000000000000000003e8",
					transactionIndex: "16",
					fromAddress: "0xaf115955b028c145ce3a7367b25a274723c5104b",
					toAddress: "0x1c7d4b196cb07b01d743fbc6116a902379c7238",
					value: "0",
					type: "2",
					v: "1",
					r: "41218196303507716801207512928422811106574930157996819781592047228571431362572",
					s: "53081739791427016520411293370047704346918717238420776039335354795688972895579",
					receiptCumulativeGasUsed: "1215350",
					receiptGasUsed: "45047",
					receiptContractAddress: null,
					receiptRoot: null,
					receiptStatus: "1",
				},
			],
			txsInternal: [],
			erc20Transfers: [
				{
					transactionHash: txHash,
					logIndex: "17",
					contract: "0x1c7d4b196cb07b01d743fbc6116a902379c7238",
					from: "0xaf115955b028c145ce3a7367b25a274723c5104b",
					to: locker.address,
					value: "1000",
					tokenName: "USDC",
					tokenSymbol: "USDC",
					tokenDecimals: "6",
					valueWithDecimals: "0.001",
					possibleSpam: false,
				},
			],
			erc20Approvals: [],
			nftTokenApprovals: [],
			nftApprovals: { ERC721: [], ERC1155: [] },
			nftTransfers: [],
			nativeBalances: [],
		};

		// 2. Process on-chain deposit event from Moralis
		const unconfirmedDepositResp = await request(app)
			.post("/integrations/moralis/webhooks/transactions")
			.send(unconfirmedDeposit);

		expect(unconfirmedDepositResp.status).toEqual(200);
		const expectedTx = {
			amount: BigInt(1000),
			txHash: txHash,
			chainId: 11155111,
			lockerId: locker.id,
			toAddress: locker.address,
			fromAddress: "0xaf115955b028c145ce3a7367b25a274723c5104b",
			isConfirmed: false,
			tokenSymbol: "USDC",
			tokenDecimals: 6,
			contractAddress: "0x1c7d4b196cb07b01d743fbc6116a902379c7238",
			lockerDirection: "in",
			automationsState: "not_started",
			triggeredByTokenTxId: null,
		};

		const txDb = await getTokenTxsRepo();
		const tx = await txDb.retrieve({ txHash: txHash, chainId: 11155111 });
		expect(tx).toMatchObject(expectedTx);

		const dbTx = {
			id: tx!.id,
			locker_id: tx!.lockerId,
			chain_id: tx!.chainId,
			contract_address: tx!.contractAddress,
			tx_hash: txHash,
			token_symbol: tx!.tokenSymbol,
			from_address: tx!.fromAddress,
			to_address: tx!.toAddress,
			token_decimals: tx!.tokenDecimals,
			is_confirmed: tx!.isConfirmed,
			amount: tx!.amount,
			locker_direction: tx!.lockerDirection,
			automations_state: tx!.automationsState,
			triggered_by_token_tx_id: tx!.triggeredByTokenTxId,
			created_at: tx!.createdAt,
			updated_at: tx!.updatedAt,
		};
		// 3. Process updated transaction from db-hooks
		const txUpdatedResp = await request(app)
			.post("/db-hooks/tokentxs/update")
			.send(
				JSON.stringify(
					{ record: dbTx },
					(key, value) =>
						typeof value === "bigint" ? value.toString() : value // return everything else unchanged
				)
			)
			.set("api-key", process.env.LOCKER_API_KEY!);

		expect(txUpdatedResp.status).toEqual(200);
		const { generatedAutomations } = txUpdatedResp.body;
		expect(generatedAutomations).toBeFalsy();

		// 4. Deposit finalized onchain
		const confirmedDeposit = {
			confirmed: true,
			chainId: "0xaa36a7",
			abi: [
				{
					name: "Transfer",
					type: "event",
					anonymous: false,
					inputs: [
						{
							type: "address",
							name: "from",
							indexed: true,
						},
						{
							type: "address",
							name: "to",
							indexed: true,
						},
						{
							type: "uint256",
							name: "value",
							indexed: false,
						},
					],
				},
			],
			streamId: "0755a037-14fa-49b5-bbfb-fc0229743c6d",
			tag: "dev",
			retries: 0,
			block: {
				number: "6055032",
				hash: "0x3dc1f7c55f9077f11072a210f3d06c5081be91519076a5e2cef28c1594ee44e2",
				timestamp: "1717725984",
			},
			logs: [
				{
					logIndex: "29",
					transactionHash: txHash,
					address: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
					data: "0x00000000000000000000000000000000000000000000000000000000000003e8",
					topic0: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
					topic1: "0x000000000000000000000000af115955b028c145ce3a7367b25a274723c5104b",
					topic2: "0x000000000000000000000000ba2d295561404fd553ff228f792b050aafdf214c",
					topic3: null,
					triggered_by: [
						"0xba2d295561404fd553ff228f792b050aafdf214c",
					],
				},
			],
			txs: [
				{
					hash: txHash,
					gas: "68140",
					gasPrice: "1500460246",
					nonce: "7",
					input: "0xa9059cbb000000000000000000000000ba2d295561404fd553ff228f792b050aafdf214c00000000000000000000000000000000000000000000000000000000000003e8",
					transactionIndex: "12",
					fromAddress: "0xaf115955b028c145ce3a7367b25a274723c5104b",
					toAddress: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
					value: "0",
					type: "2",
					v: "0",
					r: "60417685177995496783336907142549010791336465711887237963392970824466598760268",
					s: "9586921150008533502164074731259916017477965548319978297038691365793239280815",
					receiptCumulativeGasUsed: "2187544",
					receiptGasUsed: "45047",
					receiptContractAddress: null,
					receiptRoot: null,
					receiptStatus: "1",
					triggered_by: [
						"0xba2d295561404fd553ff228f792b050aafdf214c",
					],
				},
			],
			txsInternal: [],
			erc20Transfers: [
				{
					transactionHash: txHash,
					logIndex: "29",
					contract: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
					triggered_by: [
						"0xba2d295561404fd553ff228f792b050aafdf214c",
					],
					from: "0xaf115955b028c145ce3a7367b25a274723c5104b",
					to: "0xba2d295561404fd553ff228f792b050aafdf214c",
					value: "1000",
					tokenName: "USDC",
					tokenSymbol: "USDC",
					tokenDecimals: "6",
					valueWithDecimals: "0.001",
					possibleSpam: false,
				},
			],
			erc20Approvals: [],
			nftTokenApprovals: [],
			nftApprovals: {
				ERC721: [],
				ERC1155: [],
			},
			nftTransfers: [],
			nativeBalances: [],
		};

		const confirmedDepositResp = await request(app)
			.post("/integrations/moralis/webhooks/transactions")
			.send(confirmedDeposit);

		expect(confirmedDepositResp.status).toEqual(200);
		const expectedConfirmedTx = {
			amount: BigInt(1000),
			txHash: txHash,
			chainId: 11155111,
			lockerId: locker.id,
			toAddress: locker.address,
			fromAddress: "0xaf115955b028c145ce3a7367b25a274723c5104b",
			isConfirmed: true,
			tokenSymbol: "USDC",
			tokenDecimals: 6,
			contractAddress: "0x1c7d4b196cb07b01d743fbc6116a902379c7238",
			lockerDirection: "in",
			automationsState: "not_started",
			triggeredByTokenTxId: null,
		};

		const confirmedTx = await txDb.retrieve({
			txHash: txHash,
			chainId: 11155111,
		});
		expect(confirmedTx).toMatchObject(expectedConfirmedTx);

		const confirmedDbTx = {
			id: confirmedTx!.id,
			locker_id: confirmedTx!.lockerId,
			chain_id: confirmedTx!.chainId,
			contract_address: confirmedTx!.contractAddress,
			tx_hash: txHash,
			token_symbol: confirmedTx!.tokenSymbol,
			from_address: confirmedTx!.fromAddress,
			to_address: confirmedTx!.toAddress,
			token_decimals: confirmedTx!.tokenDecimals,
			is_confirmed: confirmedTx!.isConfirmed,
			amount: confirmedTx!.amount,
			locker_direction: confirmedTx!.lockerDirection,
			automations_state: confirmedTx!.automationsState,
			triggered_by_token_tx_id: confirmedTx!.triggeredByTokenTxId,
			created_at: confirmedTx!.createdAt,
			updated_at: confirmedTx!.updatedAt,
		};

		// 5. Process updated transaction from db-hooks
		const confirmedTxUpdatedResp = await request(app)
			.post("/db-hooks/tokentxs/update")
			.send(
				JSON.stringify(
					{ record: confirmedDbTx },
					(key, value) =>
						typeof value === "bigint" ? value.toString() : value // return everything else unchanged
				)
			)
			.set("api-key", process.env.LOCKER_API_KEY!);

		expect(confirmedTxUpdatedResp.status).toEqual(200);
		const { generatedAutomations: confirmedTxAutomations } =
			confirmedTxUpdatedResp.body;
		expect(confirmedTxAutomations).toBeFalsy();

		// there should still be no outbound transactions (automations) created
		const outboundTxs = await txDb.retrieveMany({
			lockerId: locker.id,
			lockerDirection: ETokenTxLockerDirection.OUT,
		});
		expect(outboundTxs).toHaveLength(0);

		// 6. Create a policy
		const policy = {
			chainId: 11155111,
			lockerId: locker.id,
			encodedIv: "456",
			automations: [
				{
					type: EAutomationType.SAVINGS,
					status: EAutomationStatus.READY,
					allocation: 0.2,
				},
				{
					type: EAutomationType.FORWARD_TO,
					status: EAutomationStatus.READY,
					allocation: 0.1,
					recipientAddress:
						"0xaf115955b028c145ce3a7367b25a274723c5104b" as `0x${string}`,
				},
				{
					type: EAutomationType.OFF_RAMP,
					status: EAutomationStatus.NEW,
					allocation: 0.7,
				},
			],
			encryptedSessionKey: "123",
		};
		const policyDb = await getPoliciesRepo();
		const newPolicy = (await policyDb.create(policy)) as PolicyInDb;
		newPolicy.encryptedSessionKey = "123";
		newPolicy.encodedIv = "456";

		const dbPolicy = {
			chain_id: policy.chainId,
			locker_id: locker.id,
			encoded_iv: policy.encodedIv,
			automations: policy.automations,
			encrypted_session_key: policy.encryptedSessionKey,
		};
		const policyResp = await request(app)
			.post("/db-hooks/policies/update")
			.send({ record: dbPolicy })
			.set("api-key", process.env.LOCKER_API_KEY!);
		expect(policyResp.status).toEqual(200);

		const txsAfterAutomations = await txDb.retrieveMany({
			lockerId: locker.id,
			lockerDirection: ETokenTxLockerDirection.OUT,
		});
		expect(txsAfterAutomations).toHaveLength(1);
		expect(txsAfterAutomations[0].triggeredByTokenTxId).toEqual(tx!.id);

		// 7. Send moralis webhook for automated tx pending
		const automationHash = genRanHex(64);
		const outgoingPendingMoralisTx = {
			confirmed: false,
			chainId: "0xaa36a7",
			abi: [
				{
					name: "Transfer",
					type: "event",
					anonymous: false,
					inputs: [
						{
							type: "address",
							name: "from",
							indexed: true,
						},
						{
							type: "address",
							name: "to",
							indexed: true,
						},
						{
							type: "uint256",
							name: "value",
							indexed: false,
						},
					],
				},
			],
			streamId: "0755a037-14fa-49b5-bbfb-fc0229743c6d",
			tag: "dev",
			retries: 0,
			block: {
				number: "6060314",
				hash: "0x9435b81af552548e2bdcd7762a1df57cfdc9272cfdeb7b1404269e8db54bc672",
				timestamp: "1717791984",
			},
			logs: [
				{
					logIndex: "70",
					transactionHash: automationHash,
					address: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
					data: "0x0000000000000000000000000000000000000000000000000000000000000064",
					topic0: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
					topic1: "0x000000000000000000000000ba2d295561404fd553ff228f792b050aafdf214c",
					topic2: "0x000000000000000000000000af115955b028c145ce3a7367b25a274723c5104b",
					topic3: null,
					triggered_by: [locker.address],
				},
			],
			txs: [
				{
					hash: automationHash,
					gas: "680417",
					gasPrice: "1200597653",
					nonce: "1063",
					input: "0x765e827f0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000433700890211c1c776c391d414cffd38efdd181100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000ba2d295561404fd553ff228f792b050aafdf214c01025467ecd60000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000b8c3c0000000000000000000000000001856c0000000000000000000000000000000000000000000000000000000000017b4f0000000000000000000000004ead9a000000000000000000000000004ebc2593000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000004e00000000000000000000000000000000000000000000000000000000000000198d703aae79538628d27099b8c4f621be4ccd142d5c5265d5d0000000000000000000000006723b44abeec4e71ebe3232bd5b455805badd22f000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000075bcd1500000000000000000000000000000000000000000000000000000000000000e412af322c018104e3ad430ea6d354d013a6789fdfc71e671c4300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000014af115955b028c145ce3a7367b25a274723c5104b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e4e9ae5c530000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000781c7d4b196cb0c7b01d743fbc6116a902379c72380000000000000000000000000000000000000000000000000000000000000000a9059cbb000000000000000000000000af115955b028c145ce3a7367b25a274723c5104b000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000b54685d9587a7f72da32dc323bfff17627aa632c6100000000000000000000000000004f6a000000000000000000000000000000010000000000000000000000000000000000000000000000000000000066636f4200000000000000000000000000000000000000000000000000000000000000000cf01e2872c81b9573b5835caa80356f57c0e6c0dc187e64b55a1a194f05985756f474a2349559f41543068b25aef78da72dbe4cd31275913b80658e52ddfd021b00000000000000000000000000000000000000000000000000000000000000000000000000000000000434000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000032000000000000000000000000000000000000000000000000000000000000003a0000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000016000067b436cad8a6d025df6c82c5bb43fbf11fc5b9b700000000000000000000000000000000000000000000000000000000000000000000000000000000002a00006a6f069e2a08c2468e7724ab3250cdbfba14d4fff46a02660f466da0bfd558a02a53fd891fb33a4400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ece9ae5c5300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001ff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041de9d63e677799a5a364822c197d56e2df10ed91940d25d585f3942290adb80864cc9d6b0be2f0d74f0a4b1c219ae92e184be18893ebfa8a314b9864c0bd1776a1b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000042fffafbf846b99f7eecf30887c22374fe9927541c3f519092be53545231fddb910779fa77ffd1275471af9de35613bba96d4f12c44ff2bbf86dbf035a44a93d13ff1b000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
					transactionIndex: "24",
					fromAddress: "0x433700890211c1c776c391d414cffd38efdd1811",
					toAddress: "0x0000000071727de22e5e9d8baf0edac6f37da032",
					value: "0",
					type: "2",
					v: "1",
					r: "66504185674972434978910967745274189224308956525390295687891885266419779960063",
					s: "16223831972579211073824057246243796757925095379059881840868158638105009556306",
					receiptCumulativeGasUsed: "3717158",
					receiptGasUsed: "589778",
					receiptContractAddress: null,
					receiptRoot: null,
					receiptStatus: "1",
					triggered_by: [locker.address],
				},
			],
			txsInternal: [
				{
					from: "0x0000000071727de22e5e9d8baf0edac6f37da032",
					to: "0x433700890211c1c776c391d414cffd38efdd1811",
					value: "841008088738867",
					gas: "86682",
					transactionHash: automationHash,
					internalTransactionIndex: "0",
					triggered_by: [locker.address],
				},
			],
			erc20Transfers: [
				{
					transactionHash: automationHash,
					logIndex: "70",
					contract: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
					triggered_by: [locker.address],
					from: locker.address,
					to: "0xaf115955b028c145ce3a7367b25a274723c5104b",
					value: "100",
					tokenName: "USDC",
					tokenSymbol: "USDC",
					tokenDecimals: "6",
					valueWithDecimals: "0.0001",
					possibleSpam: false,
				},
			],
			erc20Approvals: [],
			nftTokenApprovals: [],
			nftApprovals: {
				ERC721: [],
				ERC1155: [],
			},
			nftTransfers: [],
			nativeBalances: [],
		};

		const automationResp = await request(app)
			.post("/integrations/moralis/webhooks/transactions")
			.send(outgoingPendingMoralisTx);

		expect(automationResp.status).toEqual(200);
		const expectedAutomation = {
			amount: BigInt(100),
			txHash: automationHash,
			chainId: 11155111,
			lockerId: locker.id,
			toAddress: "0xaf115955b028c145ce3a7367b25a274723c5104b",
			fromAddress: locker.address,
			isConfirmed: false,
			tokenSymbol: "USDC",
			tokenDecimals: 6,
			contractAddress: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
			lockerDirection: ETokenTxLockerDirection.OUT,
			automationsState: ETokenTxAutomationsState.STARTED,
			triggeredByTokenTxId: null,
		};

		const automationInDb = await txDb.retrieve({
			txHash: automationHash,
			chainId: 11155111,
		});
		expect(automationInDb).toMatchObject(expectedAutomation);
	});
});
