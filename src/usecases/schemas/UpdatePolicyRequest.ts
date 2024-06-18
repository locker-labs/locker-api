import { IsArray, IsOptional, IsString, IsBoolean } from "class-validator";

import { IAutomation } from "./policies";

class UpdatePolicyRequest {
	@IsOptional()
	@IsString()
	sessionKey?: string;

	@IsOptional()
	@IsArray()
	automations?: IAutomation[];

	@IsOptional()
	@IsBoolean()
	sessionKeyIsValid?: boolean;
}

export default UpdatePolicyRequest;
