import { IsArray, IsEnum, IsNumber, IsString } from "class-validator";

import AutomationRequest from "./AutomationRequest";
import ChainIds from "./blockchains";

class CreatePolicyRequest {
	@IsNumber()
	lockerId!: number;

	@IsEnum(ChainIds)
	chainId!: ChainIds;

	@IsString()
	sessionKey!: string;

	@IsArray()
	automations!: AutomationRequest[];
}

export default CreatePolicyRequest;
