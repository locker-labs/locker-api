/* eslint-disable max-classes-per-file */

import {
	IsEnum,
	IsNumber,
	IsObject,
	IsOptional,
	IsString,
	Length,
} from "class-validator";

import ChainIds from "./blockchains";

interface Automations {
	savings: number;
	hot_wallet: number;
	off_ramp: number;
}

class CreatePolicyRequest {
	@IsNumber()
	lockerId!: number;

	@IsEnum(ChainIds)
	chainId!: ChainIds;

	@IsString()
	@Length(1804, 1804)
	sessionKey!: string;

	@IsObject()
	automations!: Automations;
}

class UpdatePolicyRequest {
	@IsOptional()
	@IsString()
	@Length(1804, 1804)
	sessionKey?: string;

	@IsOptional()
	@IsObject()
	automations?: Automations;
}

interface UpdatePoliciesRepoAdapter {
	encryptedSessionKey?: string;
	encodedIv?: string;
	automations?: Automations;
}

interface PoliciyRepoAdapter {
	lockerId: number;
	chainId: number;
	encryptedSessionKey: string;
	encodedIv: string;
	automations: Automations;
}

interface PolicyInDb extends PoliciyRepoAdapter {
	id: number;
	createdAt: Date;
	updatedAt: Date;
}

interface PolicyInDbWithoutSessionKey {
	id: number;
	lockerId: number;
	chainId: number;
	automations: Automations;
	createdAt: Date;
	updatedAt: Date;
}

export {
	CreatePolicyRequest,
	type PoliciyRepoAdapter,
	type PolicyInDb,
	type PolicyInDbWithoutSessionKey,
	type UpdatePoliciesRepoAdapter,
	UpdatePolicyRequest,
};
