import dotenv from "dotenv";

dotenv.config();

class Config {
	applicationName: string;

	environment: string;

	serverHost: string;

	serverPort: number;

	dbUrl: string;

	constructor() {
		// Application settings
		this.applicationName = process.env.APPLICATION_NAME || "locker";

		this.environment = process.env.ENVIRONMENT || "development";

		this.serverHost = process.env.SERVER_HOST || "0.0.0.0";

		this.serverPort = parseInt(process.env.SERVER_PORT!, 10) || 3000;

		// Database settings
		this.dbUrl = process.env.DB_URL!;
	}
}

export default new Config();
