/* eslint-disable max-classes-per-file */

export enum EAutomationType {
	SAVINGS = "savings",
	FORWARD_TO = "forward_to",
	OFF_RAMP = "off_ramp",
}

export enum EAutomationStatus {
	NEW = "new",
	PENDING = "pending",
	// only blocker to being READY is regenerating the session key
	AUTOMATE_THEN_READY = "automate_then_ready",
	READY = "ready",
	FAILED = "failed",
}

export enum EAutomationBatchType {
	EACH = "each",
	HOURLY = "hourly",
	DAILY = "daily",
}

// How the user wants to treat the automation
// If a user activates offramp, then deactivates it.
// The status will be READY because KYC is already done
// But the userState will be "off"
export enum EAutomationUserState {
	ON = "on",
	OFF = "off",
}

export interface IAutomation {
	type: EAutomationType;

	// 0 - 1
	allocation: number;

	// Always ready if savings or forward_to
	status: EAutomationStatus;

	// Required if forward_to or off_ramp
	recipientAddress?: `0x${string}`;

	name?: string;
	description?: string;
	goal_amount?: string;
	// contract address not used because price is chain agnostic
	goal_currency_symbol?: string;
	// Determines if user wants the automation to be active
	// If field is missing, then app assumes the automation is on.
	// This is done in order to be backwards compatible
	userState?: EAutomationUserState;
	// Defaults to each
	batchType?: EAutomationBatchType;
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
