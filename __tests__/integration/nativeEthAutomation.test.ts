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
import ChainIds from "../../src/usecases/schemas/blockchains";
import { zeroAddress } from "viem";

describe.skip("User creates policy then deposits native ETH into locker", () => {
	/**
	 * 1. New locker created
	 * 6. Policy is created, triggering db-hook
	 * 2. User deposits into locker, triggering Moralis
	 * 3. Moralis webhook creates a transaction, triggering db-hook
	 * -------- Assert NO automations are triggered ------
	 * 4. Deposit is finalized on-chain, triggering Moralis
	 * 5. Moralis webhook creates a transaction, triggering db-hook
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

		const txDb = await getTokenTxsRepo();
		const chainId = ChainIds.ARBITRUM;
		const chainIdHash = "0xa4b1";
		const depositorAddress = "0xf650429129ab74d1f2b647cd1d7e3b022f26181d";
		const forwardToAddress =
			"0x7c104a8fd81297fbfdf8edc1d234cbadac7b60a5" as `0x${string}`;

		// 1. create a locker with a new random address
		const lockersDb = await getLockersRepo();
		const locker = await lockersDb.create({
			userId: crypto.randomUUID(),
			seed: 69,
			provider: "test",
			ownerAddress: ownerWallet.address,
			address: lockerWallet.address,
		});

		const txHashDeposit = genRanHex(64);
		const txHashAutomation = genRanHex(64);
		// const txHash = genRanHex(64);

		const unconfirmedDeposit = {
			confirmed: false,
			chainId: chainIdHash,
			abi: [
				{
					name: "Transfer",
					type: "event",
					anonymous: false,
					"abi.0.type": "event",
					"abi.0.name": "Transfer",
				},
				{
					name: "UserOperationEvent",
					type: "event",
					anonymous: false,
					"abi.1.type": "event",
					"abi.1.name": "UserOperationEvent",
				},
			],
			streamId: "0755a037-14fa-49b5-bbfb-fc0229743c6d",
			tag: "dev",
			retries: 0,
			block: {
				number: "239390105",
				hash: "0x81eb7996c25fdb310a9360395985d99879b4a9153a7bce7f5cbe9d332ceb3122",
				timestamp: "1722785946",
			},
			logs: [],
			txs: [
				{
					hash: txHashDeposit,
					gas: "48036",
					gasPrice: "360236000",
					nonce: "15",
					input: "0x",
					transactionIndex: "4",
					fromAddress: depositorAddress,
					toAddress: locker.address,
					value: "100000000000",
					type: "2",
					v: "0",
					r: "27552299110009777439662551382043204086541178867272488637277417909867074378569",
					s: "30494165986963725489484246350205594949862058099230620597651718913505630762802",
					receiptCumulativeGasUsed: "557319",
					receiptGasUsed: "30250",
					receiptContractAddress: null,
					receiptRoot: null,
					receiptStatus: "1",
				},
			],
			txsInternal: [],
			erc20Transfers: [],
			erc20Approvals: [],
			nftTokenApprovals: [],
			nftApprovals: { ERC721: [], ERC1155: [] },
			nftTransfers: [],
			nativeBalances: [],
		};

		// 2. Create a policy
		// Policy payload doesn't need to be regenerated for each test
		// It has a constant structure
		const policy = {
			chainId,
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
					recipientAddress: forwardToAddress,
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
		expect(txsAfterAutomations).toHaveLength(0);

		// 2. Process on-chain deposit event from Moralis
		const unconfirmedDepositResp = await request(app)
			.post("/integrations/moralis/webhooks/transactions")
			.send(unconfirmedDeposit);

		expect(unconfirmedDepositResp.status).toEqual(200);
		const expectedTx = {
			amount: "100000000000",
			txHash: txHashDeposit,
			chainId,
			lockerId: locker.id,
			toAddress: locker.address,
			fromAddress: depositorAddress,
			isConfirmed: false,
			tokenSymbol: "ETH",
			tokenDecimals: 18,
			contractAddress: zeroAddress,
			lockerDirection: "in",
			automationsState: "not_started",
			triggeredByTokenTxId: null,
		};

		const depositTx = await txDb.retrieve({
			txHash: txHashDeposit,
			chainId,
		});
		expect(depositTx).toMatchObject(expectedTx);

		const dbTx = {
			id: depositTx!.id,
			locker_id: depositTx!.lockerId,
			chain_id: depositTx!.chainId,
			contract_address: depositTx!.contractAddress,
			tx_hash: txHashDeposit,
			token_symbol: depositTx!.tokenSymbol,
			from_address: depositTx!.fromAddress,
			to_address: depositTx!.toAddress,
			token_decimals: depositTx!.tokenDecimals,
			is_confirmed: depositTx!.isConfirmed,
			amount: depositTx!.amount,
			locker_direction: depositTx!.lockerDirection,
			automations_state: depositTx!.automationsState,
			triggered_by_token_tx_id: depositTx!.triggeredByTokenTxId,
			created_at: depositTx!.createdAt,
			updated_at: depositTx!.updatedAt,
		};

		// 3. Process updated transaction from db-hooks
		const params = JSON.stringify(
			{ record: dbTx },
			(key, value) =>
				typeof value === "bigint" ? value.toString() : value // return everything else unchanged
		);
		console.log("params", params);
		const txUpdatedResp = await request(app)
			.post("/db-hooks/tokentxs/update")
			.send(params)
			.set("api-key", process.env.LOCKER_API_KEY!);

		expect(txUpdatedResp.status).toEqual(200);
		const { generatedAutomations } = txUpdatedResp.body;
		expect(generatedAutomations).toBeFalsy();

		// 4. Deposit finalized onchain
		const confirmedDeposit = {
			confirmed: true,
			chainId: chainIdHash,
			abi: [
				{
					name: "Transfer",
					type: "event",
					anonymous: false,
					"abi.0.type": "event",
					"abi.0.name": "Transfer",
				},
				{
					name: "UserOperationEvent",
					type: "event",
					anonymous: false,
					"abi.1.type": "event",
					"abi.1.name": "UserOperationEvent",
				},
			],
			streamId: "0755a037-14fa-49b5-bbfb-fc0229743c6d",
			tag: "dev",
			retries: 0,
			block: {
				number: "239429008",
				hash: "0x7befa5c3b258850406c329df68eb5eae2b2bbf37a95f1f6bdeb5ea65eea0cf59",
				timestamp: "1722795780",
			},
			logs: [],
			txs: [
				{
					hash: txHashDeposit,
					gas: "48036",
					gasPrice: "360236000",
					nonce: "15",
					input: "0x",
					transactionIndex: "4",
					fromAddress: depositorAddress,
					toAddress: locker.address,
					value: "100000000000",
					type: "2",
					v: "0",
					r: "27552299110009777439662551382043204086541178867272488637277417909867074378569",
					s: "30494165986963725489484246350205594949862058099230620597651718913505630762802",
					receiptCumulativeGasUsed: "557319",
					receiptGasUsed: "30250",
					receiptContractAddress: null,
					receiptRoot: null,
					receiptStatus: "1",
				},
			],
			txsInternal: [],
			erc20Transfers: [],
			erc20Approvals: [],
			nftTokenApprovals: [],
			nftApprovals: { ERC721: [], ERC1155: [] },
			nftTransfers: [],
			nativeBalances: [],
		};

		const confirmedDepositResp = await request(app)
			.post("/integrations/moralis/webhooks/transactions")
			.send(confirmedDeposit);

		expect(confirmedDepositResp.status).toEqual(200);
		const expectedConfirmedTx = {
			amount: "100000000000",
			txHash: txHashDeposit,
			chainId,
			lockerId: locker.id,
			toAddress: locker.address,
			fromAddress: depositorAddress,
			isConfirmed: true,
			tokenSymbol: "ETH",
			tokenDecimals: 18,
			contractAddress: zeroAddress,
			lockerDirection: "in",
			automationsState: "not_started",
			triggeredByTokenTxId: null,
		};

		const confirmedTx = await txDb.retrieve({
			txHash: txHashDeposit,
			chainId,
		});
		expect(confirmedTx).toMatchObject(expectedConfirmedTx);
		console.log("Confirmed tx", confirmedTx);

		const confirmedDbTx = {
			id: confirmedTx!.id,
			locker_id: confirmedTx!.lockerId,
			chain_id: confirmedTx!.chainId,
			contract_address: confirmedTx!.contractAddress,
			tx_hash: txHashDeposit,
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

		console.log("Confirmed db tx", confirmedDbTx);

		// 5. Process updated transaction from db-hooks
		const params1 = JSON.parse(
			JSON.stringify(
				{ record: confirmedDbTx },
				(key, value) =>
					typeof value === "bigint" ? value.toString() : value // return everything else unchanged
			)
		);
		console.log("params1", params1);
		const confirmedTxUpdatedResp = await request(app)
			.post("/db-hooks/tokentxs/update")
			.send(params1)
			.set("api-key", process.env.LOCKER_API_KEY!);

		expect(confirmedTxUpdatedResp.status).toEqual(200);
		const { generatedAutomations: confirmedTxAutomations } =
			confirmedTxUpdatedResp.body;
		expect(confirmedTxAutomations).toBeTruthy();

		// there should still be no outbound transactions (automations) created
		const outboundTxs = await txDb.retrieveMany({
			lockerId: locker.id,
			lockerDirection: ETokenTxLockerDirection.OUT,
		});
		expect(outboundTxs).toHaveLength(1);

		// 7. Send moralis webhook for automated tx pending
		const automationHash = genRanHex(64);
		const outgoingPendingMoralisTx = {
			confirmed: false,
			chainId: chainIdHash,
			abi: [
				{
					name: "Transfer",
					type: "event",
					anonymous: false,
					"abi.0.type": "event",
					"abi.0.name": "Transfer",
				},
				{
					name: "UserOperationEvent",
					type: "event",
					anonymous: false,
					"abi.1.type": "event",
					"abi.1.name": "UserOperationEvent",
				},
			],
			streamId: "0755a037-14fa-49b5-bbfb-fc0229743c6d",
			tag: "dev",
			retries: 0,
			block: {
				number: "239449384",
				hash: "0x429ceec030ddeb249b1f695cb1952a2babc735e3c087e8a792a779181b1c5157",
				timestamp: "1722800927",
			},
			logs: [
				{
					logIndex: "2",
					transactionHash:
						"0xa5e801953d770e25d7a0de0c70fb699917e60b4980944bbca41ac7b07859a6ff",
					address: "0x0000000071727de22e5e9d8baf0edac6f37da032",
					data: "0x00023a045f52000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000034fc70c1ec000000000000000000000000000000000000000000000000000000000000585da",
					topic0: "0x49628fd1471006c1482da88028e9ce4dbb080b815c9b0344d39e5a8e6ec1419f",
					topic1: "0xba135ed27c44fd8e159870763efc9491f2a91948bfd50459c28ba6ecd4b35c54",
					topic2: "0x000000000000000000000000120c97931ac18bb683f36ae243a8a49162e9ab65",
					topic3: "0x0000000000000000000000009d0021a869f1ed3a661ffe8c9b41ec6244261d98",
				},
			],
			txs: [
				{
					hash: "0xa5e801953d770e25d7a0de0c70fb699917e60b4980944bbca41ac7b07859a6ff",
					gas: "480580",
					gasPrice: "10060000",
					nonce: "144485",
					input: "0x765e827f00000000000000000000000000000000000000000000000000000000000000400000000000000000000000004337004ec9c1417f1c7a26ebd4b4fbed6acf9e5d00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000120c97931ac18bb683f36ae243a8a49162e9ab6500023a045f520000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000001400000000000000000000000000001fcb300000000000000000000000000014432000000000000000000000000000000000000000000000000000000000003de4e0000000000000000000000000000ea6000000000000000000000000000b71b0000000000000000000000000000000000000000000000000000000000000002200000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a4e9ae5c530000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000387c104a8fd81297fbfdf8edc1d234cbadac7b60a50000000000000000000000000000000000000000000000000000000ba43b74000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000b59d0021a869f1ed3a661ffe8c9b41ec6244261d9800000000000000000000000000005528000000000000000000000000000000010000000000000000000000000000000000000000000000000000000066afdd750000000000000000000000000000000000000000000000000000000000000000286f6781b7e7d7506023039d4f8ca3412df616afccaf266dd0b138af9b646a0369d6b515754d0bde8c80ab3d98811ebb307f4ebe81343b6dee20b0879272bc731c00000000000000000000000000000000000000000000000000000000000000000000000000000000000042ffa96426d9be5d54e0bb69ff614fff78e83bbccc95491f0bfb5a620d329f87bdeb64a337e8d29b6a8ea8895e9ff460a9af79f29e6e3342d5ee94da6b91d60197f61b000000000000000000000000000000000000000000000000000000000000",
					transactionIndex: "3",
					fromAddress: "0x4337004ec9c1417f1c7a26ebd4b4fbed6acf9e5d",
					toAddress: "0x0000000071727de22e5e9d8baf0edac6f37da032",
					value: "0",
					type: "2",
					v: "0",
					r: "52155710465559572760264326276151303921110556110565014332434863184684300086483",
					s: "10412926196921400916707947744985753571407382681454306479862798785749400166479",
					receiptCumulativeGasUsed: "536813",
					receiptGasUsed: "360530",
					receiptContractAddress: null,
					receiptRoot: null,
					receiptStatus: "1",
				},
			],
			txsInternal: [
				{
					from: locker.address,
					to: "0x7c104a8fd81297fbfdf8edc1d234cbadac7b60a5",
					value: "50000000000",
					gas: "69205",
					transactionHash: automationHash,
					internalTransactionIndex: "0",
				},
				{
					from: "0x0000000071727de22e5e9d8baf0edac6f37da032",
					to: "0x4337004ec9c1417f1c7a26ebd4b4fbed6acf9e5d",
					value: "3641176760000",
					gas: "115634",
					transactionHash:
						"0xa5e801953d770e25d7a0de0c70fb699917e60b4980944bbca41ac7b07859a6ff",
					internalTransactionIndex: "1",
				},
			],
			erc20Transfers: [],
			erc20Approvals: [],
			nftTokenApprovals: [],
			nftApprovals: { ERC721: [], ERC1155: [] },
			nftTransfers: [],
			nativeBalances: [],
		};

		const automationResp = await request(app)
			.post("/integrations/moralis/webhooks/transactions")
			.send(outgoingPendingMoralisTx);

		expect(automationResp.status).toEqual(200);
		const expectedAutomation = {
			amount: "50000000000",
			txHash: automationHash,
			chainId,
			lockerId: locker.id,
			toAddress: forwardToAddress,
			fromAddress: locker.address,
			isConfirmed: false,
			tokenSymbol: "ETH",
			tokenDecimals: 18,
			contractAddress: zeroAddress,
			lockerDirection: ETokenTxLockerDirection.OUT,
			automationsState: ETokenTxAutomationsState.STARTED,
			triggeredByTokenTxId: depositTx?.id,
		};

		const automationInDb = await txDb.retrieve({
			txHash: automationHash,
			chainId,
		});
		expect(automationInDb).toMatchObject(expectedAutomation);

		// // 6. Send moralis webhook for automated tx confirmed
		// const automationHash = genRanHex(64);
		// const outgoingPendingMoralisTx = {
		// 	confirmed: false,
		// 	chainId: "0xaa36a7",
		// 	abi: [
		// 		{
		// 			name: "Transfer",
		// 			type: "event",
		// 			anonymous: false,
		// 			inputs: [
		// 				{
		// 					type: "address",
		// 					name: "from",
		// 					indexed: true,
		// 				},
		// 				{
		// 					type: "address",
		// 					name: "to",
		// 					indexed: true,
		// 				},
		// 				{
		// 					type: "uint256",
		// 					name: "value",
		// 					indexed: false,
		// 				},
		// 			],
		// 		},
		// 	],
		// 	streamId: "0755a037-14fa-49b5-bbfb-fc0229743c6d",
		// 	tag: "dev",
		// 	retries: 0,
		// 	block: {
		// 		number: "6060314",
		// 		hash: "0x9435b81af552548e2bdcd7762a1df57cfdc9272cfdeb7b1404269e8db54bc672",
		// 		timestamp: "1717791984",
		// 	},
		// 	logs: [
		// 		{
		// 			logIndex: "70",
		// 			transactionHash: automationHash,
		// 			address: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
		// 			data: "0x0000000000000000000000000000000000000000000000000000000000000064",
		// 			topic0: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
		// 			topic1: "0x000000000000000000000000ba2d295561404fd553ff228f792b050aafdf214c",
		// 			topic2: "0x000000000000000000000000af115955b028c145ce3a7367b25a274723c5104b",
		// 			topic3: null,
		// 			triggered_by: [locker.address],
		// 		},
		// 	],
		// 	txs: [
		// 		{
		// 			hash: automationHash,
		// 			gas: "680417",
		// 			gasPrice: "1200597653",
		// 			nonce: "1063",
		// 			input: "0x765e827f0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000433700890211c1c776c391d414cffd38efdd181100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000ba2d295561404fd553ff228f792b050aafdf214c01025467ecd60000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000b8c3c0000000000000000000000000001856c0000000000000000000000000000000000000000000000000000000000017b4f0000000000000000000000004ead9a000000000000000000000000004ebc2593000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000004e00000000000000000000000000000000000000000000000000000000000000198d703aae79538628d27099b8c4f621be4ccd142d5c5265d5d0000000000000000000000006723b44abeec4e71ebe3232bd5b455805badd22f000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000075bcd1500000000000000000000000000000000000000000000000000000000000000e412af322c018104e3ad430ea6d354d013a6789fdfc71e671c4300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000014af115955b028c145ce3a7367b25a274723c5104b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e4e9ae5c530000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000781c7d4b196cb0c7b01d743fbc6116a902379c72380000000000000000000000000000000000000000000000000000000000000000a9059cbb000000000000000000000000af115955b028c145ce3a7367b25a274723c5104b000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000b54685d9587a7f72da32dc323bfff17627aa632c6100000000000000000000000000004f6a000000000000000000000000000000010000000000000000000000000000000000000000000000000000000066636f4200000000000000000000000000000000000000000000000000000000000000000cf01e2872c81b9573b5835caa80356f57c0e6c0dc187e64b55a1a194f05985756f474a2349559f41543068b25aef78da72dbe4cd31275913b80658e52ddfd021b00000000000000000000000000000000000000000000000000000000000000000000000000000000000434000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000032000000000000000000000000000000000000000000000000000000000000003a0000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000016000067b436cad8a6d025df6c82c5bb43fbf11fc5b9b700000000000000000000000000000000000000000000000000000000000000000000000000000000002a00006a6f069e2a08c2468e7724ab3250cdbfba14d4fff46a02660f466da0bfd558a02a53fd891fb33a4400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ece9ae5c5300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001ff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041de9d63e677799a5a364822c197d56e2df10ed91940d25d585f3942290adb80864cc9d6b0be2f0d74f0a4b1c219ae92e184be18893ebfa8a314b9864c0bd1776a1b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000042fffafbf846b99f7eecf30887c22374fe9927541c3f519092be53545231fddb910779fa77ffd1275471af9de35613bba96d4f12c44ff2bbf86dbf035a44a93d13ff1b000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
		// 			transactionIndex: "24",
		// 			fromAddress: "0x433700890211c1c776c391d414cffd38efdd1811",
		// 			toAddress: "0x0000000071727de22e5e9d8baf0edac6f37da032",
		// 			value: "0",
		// 			type: "2",
		// 			v: "1",
		// 			r: "66504185674972434978910967745274189224308956525390295687891885266419779960063",
		// 			s: "16223831972579211073824057246243796757925095379059881840868158638105009556306",
		// 			receiptCumulativeGasUsed: "3717158",
		// 			receiptGasUsed: "589778",
		// 			receiptContractAddress: null,
		// 			receiptRoot: null,
		// 			receiptStatus: "1",
		// 			triggered_by: [locker.address],
		// 		},
		// 	],
		// 	txsInternal: [
		// 		{
		// 			from: "0x0000000071727de22e5e9d8baf0edac6f37da032",
		// 			to: "0x433700890211c1c776c391d414cffd38efdd1811",
		// 			value: "841008088738867",
		// 			gas: "86682",
		// 			transactionHash: automationHash,
		// 			internalTransactionIndex: "0",
		// 			triggered_by: [locker.address],
		// 		},
		// 	],
		// 	erc20Transfers: [
		// 		{
		// 			transactionHash: automationHash,
		// 			logIndex: "70",
		// 			contract: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
		// 			triggered_by: [locker.address],
		// 			from: locker.address,
		// 			to: "0xaf115955b028c145ce3a7367b25a274723c5104b",
		// 			value: "100",
		// 			tokenName: "USDC",
		// 			tokenSymbol: "USDC",
		// 			tokenDecimals: "6",
		// 			valueWithDecimals: "0.0001",
		// 			possibleSpam: false,
		// 		},
		// 	],
		// 	erc20Approvals: [],
		// 	nftTokenApprovals: [],
		// 	nftApprovals: {
		// 		ERC721: [],
		// 		ERC1155: [],
		// 	},
		// 	nftTransfers: [],
		// 	nativeBalances: [],
		// };

		// const automationResp = await request(app)
		// 	.post("/integrations/moralis/webhooks/transactions")
		// 	.send(outgoingPendingMoralisTx);

		// expect(automationResp.status).toEqual(200);
		// const expectedAutomation = {
		// 	amount: "100",
		// 	txHash: automationHash,
		// 	chainId,
		// 	lockerId: locker.id,
		// 	toAddress: "0xaf115955b028c145ce3a7367b25a274723c5104b",
		// 	fromAddress: locker.address,
		// 	isConfirmed: false,
		// 	tokenSymbol: "USDC",
		// 	tokenDecimals: 6,
		// 	contractAddress: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
		// 	lockerDirection: ETokenTxLockerDirection.OUT,
		// 	automationsState: ETokenTxAutomationsState.STARTED,
		// 	triggeredByTokenTxId: null,
		// };

		// const automationInDb = await txDb.retrieve({
		// 	txHash: automationHash,
		// 	chainId: 11155111,
		// });
		// expect(automationInDb).toMatchObject(expectedAutomation);
	});
});
