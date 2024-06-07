/* eslint-disable max-classes-per-file */

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
	type PolicyInDb,
	type PolicyInDbWithoutSessionKey,
	type PolicyRepoAdapter,
	type UpdatePoliciesRepoAdapter,
};
