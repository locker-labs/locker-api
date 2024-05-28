import { TokenTx } from "../../schemas/tokenTxs";

interface IAutomationService {
	/**
	 * Processes a token transaction and creates the necessary automations (hot wallet passthrough, offramp, etc).
	 * At the moment, all automations are themselves token transactions.
	 * But they transfer funds from the locker elsewhere.
	 * Returns true if maybeTrigger triggers at least one automation, false otherwise.
	 * If true, the corresponding automations are sent on-chain and persisted to DB.
	 */
	generateAutomations(maybeTrigger: TokenTx): Promise<boolean>;
}

export default IAutomationService;
