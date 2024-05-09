import dotenv from "dotenv";

dotenv.config();

class Config {
	applicationName: string;

	environment: string;

	serverHost: string;

	serverPort: number;

	dbUrl: string;

	clerkSecretkey: string;

	sepoliaRpc: string;

	baseSepoliaRpc: string;

	arbitrumSepoliaRpc: string;

	optimismSepoliaRpc: string;

	moralisStreamId: string;

	moralisApiKey: string;

	moralisStreamSecret: string;

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

		// RPCs
		this.sepoliaRpc = process.env.SEPOLIA_RPC!;

		this.baseSepoliaRpc = process.env.BASE_SEPOLIA_RPC!;

		this.arbitrumSepoliaRpc = process.env.ARBITRUM_SEPOLIA_RPC!;

		this.optimismSepoliaRpc = process.env.OPTIMISM_SEPOLIA_RPC!;

		this.moralisStreamId = process.env.MORALIS_STREAM_ID!;

		this.moralisApiKey = process.env.MORALIS_API_KEY!;

		this.moralisStreamSecret = process.env.MORALIS_STREAM_SECRET!;
	}
}

export default new Config();
