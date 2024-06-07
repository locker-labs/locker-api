/* eslint-disable max-classes-per-file */

import {
	IsArray,
	IsEnum,
	IsNumber,
	IsOptional,
	IsString,
} from "class-validator";

import ChainIds from "./blockchains";

export enum EAutomationType {
	SAVINGS = "savings",
	FORWARD_TO = "forward_to",
	OFF_RAMP = "off_ramp",
}

export enum EAutomationStatus {
	NEW = "new",
	PENDING = "pending",
	READY = "ready",
	FAILED = "failed",
}

export interface IAutomation {
	type: EAutomationType;

	// 0 - 1
	allocation: number;

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
	allocation!: number;

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

	@IsArray()
	automations!: AutomationRequest[];
}

class UpdatePolicyRequest {
	@IsOptional()
	@IsString()
	sessionKey?: string;

	@IsOptional()
	@IsArray()
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
