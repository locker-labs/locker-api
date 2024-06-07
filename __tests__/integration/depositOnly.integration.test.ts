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

const genRanHex = (size: number) =>
	[...Array(size)]
		.map(() => Math.floor(Math.random() * 16).toString(16))
		.join("");

const app = express();
app.use("/integrations/moralis", moralisRouter);
app.use("/db-hooks/tokentxs", tokentxsDbHookRouter);

describe("User deposits into locker, then policy is created", () => {
	it("does not trigger automations for deposit without policy", async () => {
		const ownerKey = generatePrivateKey();
		const ownerWallet = privateKeyToAccount(ownerKey);
		const lockerKey = generatePrivateKey();
		const lockerWallet = privateKeyToAccount(lockerKey);

		// create a locker with a new random address
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
					hash: "0x3e375800e557e19ad044fc889474bc4d4ea64af6fc03a29f6950ef2075d17241",
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

		// Process on-chain deposit event from Moralis
		const res = await request(app)
			.post("/integrations/moralis/webhooks/transactions")
			.send(unconfirmedDeposit);

		// console.log(res.error);
		expect(res.status).toEqual(200);
		console.log("reuested");
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
	});
});
// if deposit is confirmed before policy is created, then
