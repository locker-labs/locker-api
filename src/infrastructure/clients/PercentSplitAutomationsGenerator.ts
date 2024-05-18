import IAutomationsGenerator from "../../usecases/interfaces/clients/IAutomationsGenerator";
import {
	ETokenTxLockerDirection,
	TokenTx,
} from "../../usecases/schemas/tokenTxs";

export default class PercentSplitAutomationsGenerator
	implements IAutomationsGenerator
{
	async generateAutomations(maybeTrigger: TokenTx): Promise<boolean> {
		if (maybeTrigger.lockerDirection !== ETokenTxLockerDirection.IN)
			return false;

		throw new Error("Method not implemented.");
	}
}
