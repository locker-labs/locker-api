import { zeroAddress } from "viem";
import SUPPORTED_CHAINS from "../../../src/dependencies/chains";
import { adaptMoralisBody2TokenTx } from "../../../src/infrastructure/web/endpoints/integrations/moralis";
import ILockersRepo from "../../../src/usecases/interfaces/repos/lockers";
import ChainIds from "../../../src/usecases/schemas/blockchains";
import {
	ETokenTxAutomationsState,
	ETokenTxLockerDirection,
} from "../../../src/usecases/schemas/tokenTxs";
import { LockerInDb } from "../../../src/usecases/schemas/lockers";

describe("moralis", () => {
	const lockerRepo: ILockersRepo = {
		retrieve: async ({
			address,
		}: {
			address: string;
		}): Promise<LockerInDb | null> => {
			if (address !== "0x3abb17dd306cba6d4ccad0bbd880d0cbd0a2cdaa")
				return Promise.resolve(null);
			return Promise.resolve({
				address: "0x3abb17dd306cba6d4ccad0bbd880d0cbd0a2cdaa",
				userId: "user",
				seed: 0,
				provider: "test",
				ownerAddress: "0x888",
				id: 123,
				createdAt: new Date(),
				updatedAt: new Date(),
				deployments: [],
			});
		},
	} as any as ILockersRepo;

	it("adaptMoralisBody2TokenTx: ETH IN", async () => {
		const body = {
			abi: [
				{
					anonymous: false,
					inputs: [
						{ indexed: true, name: "from", type: "address" },
						{ indexed: true, name: "to", type: "address" },
						{ indexed: false, name: "value", type: "uint256" },
					],
					name: "Transfer",
					type: "event",
				},
			],
			block: {
				hash: "0xfebc3bc7f065645d6470c880ffeedd4a1322e2ac3c60be74eb02a4f0dd950487",
				number: "216102770",
				timestamp: "1716949361",
			},
			chainId: "0x89",
			confirmed: false,
			erc20Approvals: [],
			erc20Transfers: [],
			logs: [],
			nativeBalances: [],
			nftApprovals: { ERC1155: [], ERC721: [] },
			nftTokenApprovals: [],
			nftTransfers: [],
			retries: 0,
			streamId: "a62523fd-f187-4e04-b83f-8ea577a3dd29",
			tag: "prod",
			txs: [
				{
					fromAddress: "0xf650429129ab74d1f2b647cd1d7e3b022f26181d",
					gas: "105927",
					gasPrice: "10000000",
					hash: "0x5ff18ff4737b25b5e436cb6dafbabb44365ef2b6688adadc7a6b33898e2612ca",
					input: "0x",
					nonce: "21",
					r: "14247416630041928227462889552354813557263416172004612005143389364326885749199",
					receiptContractAddress: null,
					receiptCumulativeGasUsed: "331249",
					receiptGasUsed: "57484",
					receiptRoot: null,
					receiptStatus: "1",
					s: "3452729129839342105916472396773452541614816961472128523626215493099772159854",
					toAddress: "0x3abb17dd306cba6d4ccad0bbd880d0cbd0a2cdaa",
					transactionIndex: "2",
					triggered_by: [
						"0x9d93ec5fa90929cd2aeededb442c964432451d71",
					],
					type: "2",
					v: "1",
					value: "100000000000000",
				},
			],
			txsInternal: [],
		};

		const { tokenTx } = await adaptMoralisBody2TokenTx(body, lockerRepo);

		const expectedTx = {
			lockerId: 123,
			lockerDirection: ETokenTxLockerDirection.IN,
			automationsState: ETokenTxAutomationsState.NOT_STARTED,
			contractAddress: zeroAddress,
			txHash: "0x5ff18ff4737b25b5e436cb6dafbabb44365ef2b6688adadc7a6b33898e2612ca",
			tokenSymbol: "MATIC",
			tokenDecimals: 18,
			fromAddress: "0xf650429129ab74d1f2b647cd1d7e3b022f26181d",
			toAddress: "0x3abb17dd306cba6d4ccad0bbd880d0cbd0a2cdaa",
			isConfirmed: false,
			amount: BigInt(100000000000000),
			chainId: 137,
		};
		expect(tokenTx).toMatchObject(expectedTx);
	});

	it("adaptMoralisBody2TokenTx: ETH OUT", async () => {
		const body = {
			abi: [
				{
					anonymous: false,
					inputs: [
						{ indexed: true, name: "from", type: "address" },
						{ indexed: true, name: "to", type: "address" },
						{ indexed: false, name: "value", type: "uint256" },
					],
					name: "Transfer",
					type: "event",
				},
			],
			block: {
				hash: "0xfebc3bc7f065645d6470c880ffeedd4a1322e2ac3c60be74eb02a4f0dd950487",
				number: "216102770",
				timestamp: "1716949361",
			},
			chainId: "0x89",
			confirmed: false,
			erc20Approvals: [],
			erc20Transfers: [],
			logs: [],
			nativeBalances: [],
			nftApprovals: { ERC1155: [], ERC721: [] },
			nftTokenApprovals: [],
			nftTransfers: [],
			retries: 0,
			streamId: "a62523fd-f187-4e04-b83f-8ea577a3dd29",
			tag: "prod",
			txs: [
				{
					fromAddress: "0x3abb17dd306cba6d4ccad0bbd880d0cbd0a2cdaa",
					gas: "105927",
					gasPrice: "10000000",
					hash: "0x5ff18ff4737b25b5e436cb6dafbabb44365ef2b6688adadc7a6b33898e2612ca",
					input: "0x",
					nonce: "21",
					r: "14247416630041928227462889552354813557263416172004612005143389364326885749199",
					receiptContractAddress: null,
					receiptCumulativeGasUsed: "331249",
					receiptGasUsed: "57484",
					receiptRoot: null,
					receiptStatus: "1",
					s: "3452729129839342105916472396773452541614816961472128523626215493099772159854",
					toAddress: "0xf650429129ab74d1f2b647cd1d7e3b022f26181d",
					transactionIndex: "2",
					triggered_by: [
						"0x9d93ec5fa90929cd2aeededb442c964432451d71",
					],
					type: "2",
					v: "1",
					value: "100000000000000",
				},
			],
			txsInternal: [],
		};

		const { tokenTx } = await adaptMoralisBody2TokenTx(body, lockerRepo);

		const expectedTx = {
			lockerId: 123,
			lockerDirection: ETokenTxLockerDirection.OUT,
			automationsState: ETokenTxAutomationsState.NOT_STARTED,
			contractAddress: zeroAddress,
			txHash: "0x5ff18ff4737b25b5e436cb6dafbabb44365ef2b6688adadc7a6b33898e2612ca",
			tokenSymbol: "MATIC",
			tokenDecimals: 18,
			fromAddress: "0x3abb17dd306cba6d4ccad0bbd880d0cbd0a2cdaa",
			toAddress: "0xf650429129ab74d1f2b647cd1d7e3b022f26181d",
			isConfirmed: false,
			amount: BigInt(100000000000000),
			chainId: 137,
		};
		expect(tokenTx).toMatchObject(expectedTx);
	});

	it.skip("adaptMoralisBody2TokenTx: ERC20 IN", async () => {
		const body = {
			abi: [
				{
					anonymous: false,
					inputs: [
						{ indexed: true, name: "from", type: "address" },
						{ indexed: true, name: "to", type: "address" },
						{ indexed: false, name: "value", type: "uint256" },
					],
					name: "Transfer",
					type: "event",
				},
			],
			block: {
				hash: "0xfebc3bc7f065645d6470c880ffeedd4a1322e2ac3c60be74eb02a4f0dd950487",
				number: "216102770",
				timestamp: "1716949361",
			},
			chainId: "0x89",
			confirmed: false,
			erc20Approvals: [],
			erc20Transfers: [],
			logs: [],
			nativeBalances: [],
			nftApprovals: { ERC1155: [], ERC721: [] },
			nftTokenApprovals: [],
			nftTransfers: [],
			retries: 0,
			streamId: "a62523fd-f187-4e04-b83f-8ea577a3dd29",
			tag: "prod",
			txs: [
				{
					fromAddress: "0xf650429129ab74d1f2b647cd1d7e3b022f26181d",
					gas: "105927",
					gasPrice: "10000000",
					hash: "0x5ff18ff4737b25b5e436cb6dafbabb44365ef2b6688adadc7a6b33898e2612ca",
					input: "0x",
					nonce: "21",
					r: "14247416630041928227462889552354813557263416172004612005143389364326885749199",
					receiptContractAddress: null,
					receiptCumulativeGasUsed: "331249",
					receiptGasUsed: "57484",
					receiptRoot: null,
					receiptStatus: "1",
					s: "3452729129839342105916472396773452541614816961472128523626215493099772159854",
					toAddress: "0x3abb17dd306cba6d4ccad0bbd880d0cbd0a2cdaa",
					transactionIndex: "2",
					triggered_by: [
						"0x9d93ec5fa90929cd2aeededb442c964432451d71",
					],
					type: "2",
					v: "1",
					value: "100000000000000",
				},
			],
			txsInternal: [],
		};

		const { tokenTx } = await adaptMoralisBody2TokenTx(body, lockerRepo);

		const expectedTx = {
			lockerId: 123,
			lockerDirection: ETokenTxLockerDirection.IN,
			automationsState: ETokenTxAutomationsState.NOT_STARTED,
			contractAddress: zeroAddress,
			txHash: "0x5ff18ff4737b25b5e436cb6dafbabb44365ef2b6688adadc7a6b33898e2612ca",
			tokenSymbol: "MATIC",
			tokenDecimals: 18,
			fromAddress: "0xf650429129ab74d1f2b647cd1d7e3b022f26181d",
			toAddress: "0x3abb17dd306cba6d4ccad0bbd880d0cbd0a2cdaa",
			isConfirmed: false,
			amount: BigInt(100000000000000),
			chainId: 137,
		};
		expect(tokenTx).toMatchObject(expectedTx);
	});
});
