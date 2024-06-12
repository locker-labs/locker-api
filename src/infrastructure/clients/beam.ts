import config from "../../config";
import { logger } from "../../dependencies/logger";
import IOffRampClient from "../../usecases/interfaces/clients/offramp";

export default class BeamClient implements IOffRampClient {
	async getAccount(accountId: string): Promise<any> {
		const url = `${config.beamBaseUrl}/accounts/individuals/${accountId}`;
		const options = {
			method: "GET",
			headers: {
				Authorization: `Bearer ${config.beamApiKey}`,
				Accept: "application/json",
			},
		};

		try {
			const response = await fetch(url, options);
			if (!response.ok) {
				throw new Error(`Error: ${response.status}`);
			}
			return await response.json();
		} catch (error: any) {
			logger.error(`Failed to fetch account: ${error.message}`);
			throw error;
		}
	}
}
