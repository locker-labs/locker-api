import config from "../../config";
import { logger } from "../../dependencies/logger";
import IOffRampClient from "../../usecases/interfaces/clients/offramp";

export default class BeamClient implements IOffRampClient {
	private async apiCall(url: string, options: RequestInit): Promise<any> {
		try {
			const response = await fetch(url, options);
			if (!response.ok) {
				throw new Error(`Error: ${response.status}`);
			}
			return await response.json();
		} catch (error: any) {
			logger.error(`API call failed: ${error.message}`);
			throw error;
		}
	}

	async getAccount(accountId: string): Promise<any> {
		const url = `${config.beamBaseUrl}/accounts/individuals/${accountId}`;
		const options = {
			method: "GET",
			headers: {
				Authorization: `Bearer ${config.beamApiKey}`,
				Accept: "application/json",
			},
		};

		return this.apiCall(url, options);
	}

	async createAccount(
		emailAddress: string,
		sourceAddress: string
	): Promise<any> {
		const url = `${config.beamBaseUrl}/accounts/individuals`;
		const options = {
			method: "POST",
			headers: {
				Authorization: `Bearer ${config.beamApiKey}`,
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				kyc: {
					emailAddress,
				},
				sourceAddresses: [sourceAddress],
			}),
		};

		return this.apiCall(url, options);
	}
}
