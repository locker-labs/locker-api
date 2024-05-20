/* eslint-disable max-classes-per-file */

import {
	IsEnum,
	IsNumber,
	IsObject,
	IsOptional,
	IsString,
} from "class-validator";

import ChainIds from "./blockchains";

export interface IAutomation {
	type: "savings" | "forward_to" | "off_ramp";
	// 0 - 1
	allocation: number;
	// Always ready if savings or forward_to
	status: "new" | "pending" | "ready" | "failed";
	// Required if forward_to or off_ramp
	recipientAddress?: `0x${string}`;
}

class CreatePolicyRequest {
	@IsNumber()
	lockerId!: number;

	@IsEnum(ChainIds)
	chainId!: ChainIds;

	@IsString()
	sessionKey!: string;

	@IsObject()
	automations!: IAutomation[];
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
	PolicyRepoAdapter,
	type UpdatePoliciesRepoAdapter,
	UpdatePolicyRequest,
};
