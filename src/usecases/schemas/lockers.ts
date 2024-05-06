/* eslint-disable max-classes-per-file */
import { IsOptional, IsString, Length } from "class-validator";

class CreateLockerRequest {
	@IsString()
	@Length(42, 42) // addresses are exactly 42 characters
	address!: string;

	@IsString()
	@Length(42, 42) // addresses are exactly 42 characters
	ownerAddress!: string;

	@IsString()
	@Length(1, 32)
	seed!: string;

	@IsString()
	@Length(1, 64)
	provider!: string;

	@IsString()
	@Length(1, 32)
	chainId!: string;
}

class UpdateLockerRequest {
	@IsOptional()
	@IsString()
	@Length(42, 42) // addresses are exactly 42 characters
	ownerAddress?: string;

	@IsOptional()
	@IsString()
	@Length(66, 66) // evm tx hashes are exactly 66 characters
	deploymentTxHash?: string;
}

interface UpdateLockerRepoAdapter {
	deploymentTxHash?: string;
	ownerAddress?: string;
}

interface LockerRepoAdapter {
	userId: string;
	seed: string;
	provider: string;
	deploymentTxHash?: string;
	ownerAddress: string;
	address: string;
	chainId: number;
}

interface LockerInDb extends LockerRepoAdapter {
	id: number;
	createdAt: Date;
	updatedAt: Date;
	deploymentTxId: number;
}

export {
	CreateLockerRequest,
	type LockerInDb,
	type LockerRepoAdapter,
	type UpdateLockerRepoAdapter,
	UpdateLockerRequest,
};
