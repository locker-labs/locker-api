import { IsString, Length } from "class-validator";

enum EOffRampAccountStatus {
	PENDING = "pending",
	APPROVED = "approved",
	REJECTED = "rejected",
}

class CreateOfframpRequest {
	@IsString()
	@Length(42, 42) // addresses are exactly 42 characters
	address!: `0x${string}`;
}

interface IOffRampRepoAdapter {
	lockerId: number;
	beamAccountId: string;
	status: string;
	onboardingUrl: string;
	errors?: string;
}

interface OffRampRepoUpdateAdapter {
	status: string;
	errors?: string | null;
}

interface OffRampInDb extends IOffRampRepoAdapter {
	id: number;
	createdAt: Date;
	updatedAt: Date;
}

export {
	CreateOfframpRequest,
	EOffRampAccountStatus,
	type OffRampInDb,
	type IOffRampRepoAdapter as OffRampRepoAdapter,
	type OffRampRepoUpdateAdapter,
};
