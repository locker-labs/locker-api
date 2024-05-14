import dotenv from "dotenv";

dotenv.config();

class Config {
	// Application
	applicationName: string;

	environment: string;

	serverHost: string;

	serverPort: number;

	// Database
	dbUrl: string;

	// Clerk
	clerkSecretkey: string;

	// Chain RPCs
	arbitrumRpc: string;

	ethereumRpc: string;

	polygonRpc: string;

	avalancheRpc: string;

	optimismRpc: string;

	baseRpc: string;

	sepoliaRpc: string;

	baseSepoliaRpc: string;

	arbitrumSepoliaRpc: string;

	optimismSepoliaRpc: string;

	avalancheFujiRpc: string;

	polygonMumbaiRpc: string;

	// Moralis
	moralisStreamId: string;

	moralisApiKey: string;

	moralisStreamSecret: string;

	// Locker
	lockerBaseUrl: string;

	// Resend
	resendApiKey: string;

	// Encription
	encriptionAlgorithm: string;

	encriptionKey: string;

	constructor() {
		// Application settings
		this.applicationName = process.env.APPLICATION_NAME || "locker";

		this.environment = process.env.ENVIRONMENT || "development";

		this.serverHost = process.env.SERVER_HOST || "0.0.0.0";

		this.serverPort = parseInt(process.env.SERVER_PORT!, 10) || 3000;

		// Database settings
		this.dbUrl = process.env.DB_URL!;

		// Clerk
		this.clerkSecretkey = process.env.CLERK_SECRET_KEY!;

		// Chain RPCs
		this.arbitrumRpc = process.env.ARBITRUM_RPC!;

		this.ethereumRpc = process.env.ETHEREUM_RPC!;

		this.polygonRpc = process.env.POLYGON_RPC!;

		this.avalancheRpc = process.env.AVALANCHE_RPC!;

		this.optimismRpc = process.env.OPTIMISM_RPC!;

		this.baseRpc = process.env.BASE_RPC!;

		this.sepoliaRpc = process.env.SEPOLIA_RPC!;

		this.baseSepoliaRpc = process.env.BASE_SEPOLIA_RPC!;

		this.arbitrumSepoliaRpc = process.env.ARBITRUM_SEPOLIA_RPC!;

		this.optimismSepoliaRpc = process.env.OPTIMISM_SEPOLIA_RPC!;

		this.avalancheFujiRpc = process.env.AVALANCHE_FUJI_RPC!;

		this.polygonMumbaiRpc = process.env.POLYGON_MUMBAI_RPC!;

		// Moralis
		this.moralisStreamId = process.env.MORALIS_STREAM_ID!;

		this.moralisApiKey = process.env.MORALIS_API_KEY!;

		this.moralisStreamSecret = process.env.MORALIS_STREAM_SECRET!;

		// Locker
		this.lockerBaseUrl = process.env.LOCKER_BASE_URL!;

		// Resend
		this.resendApiKey = process.env.RESEND_API_KEY!;

		// Encrption
		this.encriptionAlgorithm = process.env.ENCRYPTION_ALGORITHM!;
		this.encriptionKey = process.env.ENCRYPTION_KEY!;
	}
}

export default new Config();
