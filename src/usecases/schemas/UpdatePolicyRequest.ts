import { IsArray, IsOptional, IsString } from "class-validator";

import { IAutomation } from "./policies";

class UpdatePolicyRequest {
	@IsOptional()
	@IsString()
	sessionKey?: string;

	@IsOptional()
	@IsArray()
	automations?: IAutomation[];
}

export default UpdatePolicyRequest;
