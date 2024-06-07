import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";

import { EAutomationStatus, EAutomationType, IAutomation } from "./policies";

class AutomationRequest implements IAutomation {
	@IsEnum(EAutomationType)
	type!: EAutomationType;

	// 0 - 1
	@IsNumber()
	allocation!: number;

	// Always ready if savings or forward_to
	@IsEnum(EAutomationStatus)
	status!: EAutomationStatus;

	// Required if forward_to or off_ramp
	@IsString()
	@IsOptional()
	recipientAddress?: `0x${string}`;
}

export default AutomationRequest;
