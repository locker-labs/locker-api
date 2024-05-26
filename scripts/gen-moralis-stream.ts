// We use Moralis for listening to on-chain events
// One stream is created for all addresses we want to
import dotenv from "dotenv";
import Moralis from "moralis";

dotenv.config();

// Subset of Moralis + ZeroDev supported chains
// https://docs.moralis.io/supported-chains
// https://docs.zerodev.app/sdk/faqs/chains#supported-networks
const chains = [
	// sepolia - 11155111
	"0xaa36a7",

	// arbitrum sepolia - 421614
	"0x66eee",
	// arbitrum one - 42161
	"0xa4b1",

	// avalanche fuji - 43113
	"0xa869",
	// avalanche mainnet - 43114
	"0xa86a",

	// base sepolia - 84532
	"0x14a34",
	// base mainnet - 8453
	"0x2105",

	// linea mainnet - 59144
	// "0xe708",

	// ZeroDev is on linea goerli currently but moralis is on sepolia, so we have to use mainnet
	// linea sepolia - 59141
	// "0xe705",

	// gnosis mainnet - 100
	// "0x64",

	// optimism sepolia - 11155420
	"0xaa37dc",
	// optimism mainnet - 10
	"0xa",

	// polygon amoy - 80002
	"0x13882",
	// polygon mainnet - 137
	"0x89",
];

const tag = "staging";
const description = `Transactions ${tag}`;

const ERC20TransferEventABI = [
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				name: "from",
				type: "address",
			},
			{
				indexed: true,
				name: "to",
				type: "address",
			},
			{
				indexed: false,
				name: "value",
				type: "uint256",
			},
		],
		name: "Transfer",
		type: "event",
	},
];

const createStream = async () => {
	const host = process.env.LOCKER_BASE_URL;

	// Omit leading slash
	const txUpdatePath = `integrations/moralis/webhooks/transactions`;
	const webhookUrl = `${host}/${txUpdatePath}`;

	const topic = "Transfer(address,address,uint256)";

	const response = await Moralis.Streams.add({
		webhookUrl,
		description,
		tag,
		chains,
		includeNativeTxs: true,
		abi: ERC20TransferEventABI,
		includeContractLogs: true,
		topic0: [topic],
	});

	return response.toJSON().id;
};

const doCreateStream = async () => {
	await Moralis.start({
		apiKey: process.env.MORALIS_API_KEY,
	});

	await createStream();
};

doCreateStream();
