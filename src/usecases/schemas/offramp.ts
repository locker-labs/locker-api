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

interface OffRampRepoAdapter {
	lockerId: number;
	beamAccountId: string;
	status: string;
	errors?: string;
}

interface OffRampRepoUpdateAdapter {
	status: string;
	errors?: string | null;
}

interface OffRampInDb extends OffRampRepoAdapter {
	id: number;
	createdAt: Date;
	updatedAt: Date;
}

export {
	type OffRampRepoAdapter,
	type OffRampInDb,
	type OffRampRepoUpdateAdapter,
	CreateOfframpRequest,
	EOffRampAccountStatus,
};
