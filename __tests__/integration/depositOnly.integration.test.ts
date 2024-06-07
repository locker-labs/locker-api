import { chainId } from "permissionless";
import { getLockersRepo, getTokenTxsRepo } from "../../src/dependencies";
import express, { Express } from "express";
import moralisRouter from "../../src/infrastructure/web/endpoints/integrations/moralis";
import crypto from "crypto";
import request from "supertest";
import { generatePrivateKey } from "viem/accounts";
import { privateKeyToAccount } from "viem/accounts";
import tokentxsDbHookRouter from "../../src/infrastructure/web/endpoints/db-hooks/tokentxs";
import AutomationService from "../../src/usecases/services/automation";
import { ETokenTxLockerDirection } from "../../src/usecases/schemas/tokenTxs";
import policiesDbHookRouter from "../../src/infrastructure/web/endpoints/db-hooks/policies";

const genRanHex = (size: number) =>
	[...Array(size)]
		.map(() => Math.floor(Math.random() * 16).toString(16))
		.join("");

const app = express();
app.use("/integrations/moralis", moralisRouter);
app.use("/db-hooks/tokentxs", tokentxsDbHookRouter);
app.use("/db-hooks/policies", policiesDbHookRouter);

describe("User deposits into locker, then policy is created", () => {
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
	 */
	it("does not trigger automations for deposit without policy", async () => {
		const ownerKey = generatePrivateKey();
		const ownerWallet = privateKeyToAccount(ownerKey);
		const lockerKey = generatePrivateKey();
		const lockerWallet = privateKeyToAccount(lockerKey);

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

		console.log("about to request");

		// 2. Process on-chain deposit event from Moralis
		const unconfirmedDepositResp = await request(app)
			.post("/integrations/moralis/webhooks/transactions")
			.send(unconfirmedDeposit);

		// console.log(res.error);
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
		console.log(tx);
		expect(tx).toMatchObject(expectedTx);

		// 3. Process updated transaction from db-hooks
		const txUpdatedResp = await request(app)
			.post("/db-hooks/tokentxs/update")
			.send(
				JSON.stringify(
					{ record: tx },
					(key, value) =>
						typeof value === "bigint" ? value.toString() : value // return everything else unchanged
				)
			)
			.set("api-key", process.env.LOCKER_API_KEY!);

		console.log(txUpdatedResp.error);
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
		console.log(confirmedTx);
		expect(confirmedTx).toMatchObject(expectedConfirmedTx);

		// 5. Process updated transaction from db-hooks
		const confirmedTxUpdatedResp = await request(app)
			.post("/db-hooks/tokentxs/update")
			.send(
				JSON.stringify(
					{ record: tx },
					(key, value) =>
						typeof value === "bigint" ? value.toString() : value // return everything else unchanged
				)
			)
			.set("api-key", process.env.LOCKER_API_KEY!);

		console.log(confirmedTxUpdatedResp.error);
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
			id: 3,
			chain_id: 11155111,
			locker_id: locker.id,
			created_at: "2024-06-07T02:47:19.270127+00:00",
			encoded_iv: "==",
			updated_at: "2024-06-07T02:47:19.270127+00:00",
			automations: [
				{ type: "savings", status: "ready", allocation: 0.2 },
				{
					type: "forward_to",
					status: "ready",
					allocation: 0.1,
					recipientAddress:
						"0xaf115955b028c145ce3a7367b25a274723c5104b",
				},
				{ type: "off_ramp", status: "new", allocation: 0.7 },
			],
			encrypted_session_key: "000",
		};
		const policyResp = await request(app)
			.post("/db-hooks/policies/update")
			.send(JSON.stringify({ record: policy }))
			.set("api-key", process.env.LOCKER_API_KEY!);
		expect(policyResp.status).toEqual(200);

		const txsAfterAutomations = await txDb.retrieveMany({
			lockerId: locker.id,
			lockerDirection: ETokenTxLockerDirection.OUT,
		});
		expect(txsAfterAutomations).toHaveLength(1);
	});
});
// if deposit is confirmed before policy is created, then
