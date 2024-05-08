/* eslint-disable max-classes-per-file */
import { IsOptional, IsString, Length } from "class-validator";

class CreateLockerRequest {
	@IsString()
	@Length(42, 42) // addresses are exactly 42 characters
	address!: `0x${string}`;

	@IsString()
	@Length(42, 42) // addresses are exactly 42 characters
	ownerAddress!: `0x${string}`;

	@IsString()
	@Length(1, 32)
	seed!: number;

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
	ownerAddress?: `0x${string}`;

	@IsOptional()
	@IsString()
	@Length(66, 66) // evm tx hashes are exactly 66 characters
	deploymentTxHash?: `0x${string}`;
}

interface UpdateLockerRepoAdapter {
	deploymentTxHash?: string;
	ownerAddress?: string;
}

interface LockerRepoAdapter {
	userId: string;
	seed: number;
	provider: string;
	deploymentTxHash?: `0x${string}`;
	ownerAddress: `0x${string}`;
	address: `0x${string}`;
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
