import { zeroAddress } from "viem";
import { adaptMoralisBody2TokenTx } from "../../../src/infrastructure/web/endpoints/integrations/moralis";
import ILockersRepo from "../../../src/usecases/interfaces/repos/lockers";
import ChainIds from "../../../src/usecases/schemas/blockchains";
import {
	ETokenTxAutomationsState,
	ETokenTxLockerDirection,
} from "../../../src/usecases/schemas/tokenTxs";
import { LockerInDb } from "../../../src/usecases/schemas/lockers";

const lockerAddress = "0x3abb17dd306cba6d4ccad0bbd880d0cbd0a2cdaa";
describe("moralis", () => {
	const lockerRepo: ILockersRepo = {
		retrieve: async ({
			address,
		}: {
			address: string;
		}): Promise<LockerInDb | null> => {
			if (address !== lockerAddress) return Promise.resolve(null);
			return Promise.resolve({
				address: lockerAddress,
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
					toAddress: lockerAddress,
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
			toAddress: lockerAddress,
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
					fromAddress: lockerAddress,
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
			fromAddress: lockerAddress,
			toAddress: "0xf650429129ab74d1f2b647cd1d7e3b022f26181d",
			isConfirmed: false,
			amount: BigInt(100000000000000),
			chainId: 137,
		};
		expect(tokenTx).toMatchObject(expectedTx);
	});

	it("adaptMoralisBody2TokenTx: ERC20 IN", async () => {
		const body = {
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
				number: "6060299",
				hash: "0x83160f8e8c713f2592a7d5b19ced16f1c3f14b06d105681b5683989786c67cf7",
				timestamp: "1717791792",
			},
			logs: [
				{
					logIndex: "54",
					transactionHash:
						"0x1ee86655bc72455be4afea5798fddf82e18b46a07eec7238038fc36a2561a2e3",
					address: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
					data: "0x00000000000000000000000000000000000000000000000000000000000003e8",
					topic0: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
					topic1: "0x000000000000000000000000af115955b028c145ce3a7367b25a274723c5104b",
					topic2: "0x000000000000000000000000ba2d295561404fd553ff228f792b050aafdf214c",
					topic3: null,
					triggered_by: [lockerAddress],
				},
			],
			txs: [
				{
					hash: "0x1ee86655bc72455be4afea5798fddf82e18b46a07eec7238038fc36a2561a2e3",
					gas: "68140",
					gasPrice: "1500396715",
					nonce: "14",
					input: "0xa9059cbb000000000000000000000000ba2d295561404fd553ff228f792b050aafdf214c00000000000000000000000000000000000000000000000000000000000003e8",
					transactionIndex: "22",
					fromAddress: "0xaf115955b028c145ce3a7367b25a274723c5104b",
					toAddress: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
					value: "0",
					type: "2",
					v: "0",
					r: "48020148678244103760060583155751074784499967686879016188482389884176121063084",
					s: "50331974416710599305002211980435909587715589558569343384326483461273467040728",
					receiptCumulativeGasUsed: "3505020",
					receiptGasUsed: "45047",
					receiptContractAddress: null,
					receiptRoot: null,
					receiptStatus: "1",
					triggered_by: [lockerAddress],
				},
			],
			txsInternal: [],
			erc20Transfers: [
				{
					transactionHash:
						"0x1ee86655bc72455be4afea5798fddf82e18b46a07eec7238038fc36a2561a2e3",
					logIndex: "54",
					contract: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
					triggered_by: [lockerAddress],
					from: "0xaf115955b028c145ce3a7367b25a274723c5104b",
					to: lockerAddress,
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

		const { tokenTx } = await adaptMoralisBody2TokenTx(body, lockerRepo);

		const expectedTx = {
			lockerId: 123,
			lockerDirection: ETokenTxLockerDirection.IN,
			automationsState: ETokenTxAutomationsState.NOT_STARTED,
			contractAddress: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
			txHash: "0x1ee86655bc72455be4afea5798fddf82e18b46a07eec7238038fc36a2561a2e3",
			tokenSymbol: "USDC",
			tokenDecimals: 6,
			fromAddress: "0xaf115955b028c145ce3a7367b25a274723c5104b",
			toAddress: lockerAddress,
			isConfirmed: true,
			amount: BigInt(1000),
			chainId: ChainIds.SEPOLIA,
		};
		expect(tokenTx).toMatchObject(expectedTx);
	});

	it("adaptMoralisBody2TokenTx: ERC20 OUT", async () => {
		const body = {
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
					transactionHash:
						"0x1a5bdd3fddb39903853cecfc04d2af183fe981a4b34dc807b58bca171da2500a",
					address: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
					data: "0x0000000000000000000000000000000000000000000000000000000000000064",
					topic0: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
					topic1: "0x000000000000000000000000ba2d295561404fd553ff228f792b050aafdf214c",
					topic2: "0x000000000000000000000000af115955b028c145ce3a7367b25a274723c5104b",
					topic3: null,
					triggered_by: [lockerAddress],
				},
			],
			txs: [
				{
					hash: "0x1a5bdd3fddb39903853cecfc04d2af183fe981a4b34dc807b58bca171da2500a",
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
					triggered_by: [lockerAddress],
				},
			],
			txsInternal: [
				{
					from: "0x0000000071727de22e5e9d8baf0edac6f37da032",
					to: "0x433700890211c1c776c391d414cffd38efdd1811",
					value: "841008088738867",
					gas: "86682",
					transactionHash:
						"0x1a5bdd3fddb39903853cecfc04d2af183fe981a4b34dc807b58bca171da2500a",
					internalTransactionIndex: "0",
					triggered_by: [lockerAddress],
				},
			],
			erc20Transfers: [
				{
					transactionHash:
						"0x1a5bdd3fddb39903853cecfc04d2af183fe981a4b34dc807b58bca171da2500a",
					logIndex: "70",
					contract: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
					triggered_by: [lockerAddress],
					from: lockerAddress,
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

		const { tokenTx } = await adaptMoralisBody2TokenTx(body, lockerRepo);

		const expectedTx = {
			lockerId: 123,
			lockerDirection: ETokenTxLockerDirection.OUT,
			automationsState: ETokenTxAutomationsState.STARTED,
			contractAddress: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
			txHash: "0x1a5bdd3fddb39903853cecfc04d2af183fe981a4b34dc807b58bca171da2500a",
			tokenSymbol: "USDC",
			tokenDecimals: 6,
			fromAddress: lockerAddress,
			toAddress: "0xaf115955b028c145ce3a7367b25a274723c5104b",
			isConfirmed: false,
			amount: BigInt(100),
			chainId: ChainIds.SEPOLIA,
		};
		expect(tokenTx).toMatchObject(expectedTx);
	});
});
