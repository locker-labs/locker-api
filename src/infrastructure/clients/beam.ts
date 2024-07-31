/* eslint-disable @typescript-eslint/no-explicit-any */
import config from "../../config";
import { logger } from "../../dependencies/logger";
import IOffRampClient from "../../usecases/interfaces/clients/offramp";

export default class BeamClient implements IOffRampClient {
	private async apiCall(url: string, options: RequestInit): Promise<any> {
		console.log("Making API call to: ", url);
		console.log("With options: ", options);
		try {
			const response = await fetch(url, options);
			const responseJson = await response.json();
			console.log("GOt response");
			console.log(responseJson);
			// console.log(response.
			if (!response.ok) {
				// console.log(await response.text());
				throw new Error(`Error: ${response.status}`);
			}
			return responseJson;
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
		console.log("Creating account with email: ", emailAddress);
		console.log("Creating account with sourceAddress: ", sourceAddress);
		const url = `${config.beamBaseUrl}/accounts/individuals`;
		console.log("Creating account with url: ", url);
		console.log("Creating account with key: ", config.beamApiKey);

		const args = {
			kyc: {
				emailAddress,
			},
			sourceAddresses: [sourceAddress],
		};

		console.log("Creating account with args: ", args);

		const options = {
			method: "POST",
			headers: {
				Authorization: `Bearer ${config.beamApiKey}`,
				accept: "application/json",
				"content-type": "application/json",
			},
			body: JSON.stringify(args),
		};

		return this.apiCall(url, options);
	}
}
