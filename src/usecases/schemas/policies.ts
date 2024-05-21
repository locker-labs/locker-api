/* eslint-disable max-classes-per-file */

import {
	IsArray,
	IsEnum,
	IsNumber,
	IsObject,
	IsOptional,
	IsString,
} from "class-validator";

import ChainIds from "./blockchains";

enum EAutomationType {
	SAVINGS = "savings",
	FORWARD_TO = "forward_to",
	OFF_RAMP = "off_ramp",
}

enum EAutomationStatus {
	NEW = "new",
	PENDING = "pending",
	READY = "ready",
	FAILED = "failed",
}

export interface IAutomation {
	type: EAutomationType;

	// 0 - 1
	allocationFactor: number;

	// Always ready if savings or forward_to
	status: EAutomationStatus;

	// Required if forward_to or off_ramp
	recipientAddress?: `0x${string}`;
}

class AutomationRequest implements IAutomation {
	@IsEnum(EAutomationType)
	type!: EAutomationType;

	// 0 - 1
	@IsNumber()
	allocationFactor!: number;

	// Always ready if savings or forward_to
	@IsEnum(EAutomationStatus)
	status!: EAutomationStatus;

	// Required if forward_to or off_ramp
	@IsString()
	@IsOptional()
	recipientAddress?: `0x${string}`;
}

class CreatePolicyRequest {
	@IsNumber()
	lockerId!: number;

	@IsEnum(ChainIds)
	chainId!: ChainIds;

	@IsString()
	sessionKey!: string;

	// @Type(() => AutomationRequest)
	@IsArray()
	automations!: AutomationRequest[];
}

class UpdatePolicyRequest {
	@IsOptional()
	@IsString()
	sessionKey?: string;

	@IsOptional()
	@IsObject()
	automations?: IAutomation[];
}

interface UpdatePoliciesRepoAdapter {
	encryptedSessionKey?: string;
	encodedIv?: string;
	automations?: IAutomation[];
}

interface PolicyRepoAdapter {
	lockerId: number;
	chainId: number;
	encryptedSessionKey: string;
	encodedIv: string;
	automations: IAutomation[];
}

interface PolicyInDb extends PolicyRepoAdapter {
	id: number;
	createdAt: Date;
	updatedAt: Date;
}

interface PolicyInDbWithoutSessionKey {
	id: number;
	lockerId: number;
	chainId: number;
	automations: IAutomation[];
	createdAt: Date;
	updatedAt: Date;
}

export {
	CreatePolicyRequest,
	type PolicyInDb,
	type PolicyInDbWithoutSessionKey,
	type PolicyRepoAdapter,
	type UpdatePoliciesRepoAdapter,
	UpdatePolicyRequest,
};
