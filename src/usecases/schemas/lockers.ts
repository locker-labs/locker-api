/* eslint-disable max-classes-per-file */
import { IsEnum, IsOptional, IsString, Length } from "class-validator";

import ChainIds from "./blockchains";

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
}

class UpdateLockerRequest {
	@IsOptional()
	@IsString()
	@Length(42, 42) // addresses are exactly 42 characters
	ownerAddress?: `0x${string}`;

	@IsOptional()
	@IsEnum(ChainIds)
	chainId?: ChainIds;

	@IsOptional()
	@IsString()
	@Length(66, 66) // evm tx hashes are exactly 66 characters
	deploymentTxHash?: `0x${string}`;
}

interface UpdateLockerRepoAdapter {
	deploymentTxHash?: string;
	chainId?: number;
	ownerAddress?: string;
}

interface LockerRepoAdapter {
	userId: string;
	seed: number;
	provider: string;
	ownerAddress: `0x${string}`;
	address: `0x${string}`;
}

interface DeploymentRecord {
	id: number;
	lockerId: number;
	txHash: `0x${string}`;
	chainId: number;
	createdAt: Date;
	updatedAt: Date;
}

interface LockerInDb extends LockerRepoAdapter {
	id: number;
	createdAt: Date;
	updatedAt: Date;
	deployments: DeploymentRecord[];
}

export {
	CreateLockerRequest,
	type DeploymentRecord,
	type LockerInDb,
	type LockerRepoAdapter,
	type UpdateLockerRepoAdapter,
	UpdateLockerRequest,
};
