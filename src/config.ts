import dotenv from "dotenv";

dotenv.config();

class Config {
	applicationName: string;

	environment: string;

	serverHost: string;

	serverPort: number;

	dbUrl: string;

	clerkSecretkey: string;

	sepolia_rpc: string;

	base_sepolia_rpc: string;

	arbitrum_sepolia_rpc: string;

	optimism_sepolia_rpc: string;

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
		this.sepolia_rpc = process.env.SEPOLIA_RPC!;

		this.base_sepolia_rpc = process.env.BASE_SEPOLIA_RPC!;

		this.arbitrum_sepolia_rpc = process.env.ARBITRUM_SEPOLIA_RPC!;

		this.optimism_sepolia_rpc = process.env.OPTIMISM_SEPOLIA_RPC!;
	}
}

export default new Config();
