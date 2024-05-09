/* eslint-disable max-classes-per-file */
import {
	IsArray,
	IsBoolean,
	IsHexadecimal,
	IsInt,
	IsString,
	ValidateNested,
} from "class-validator";

class BlockInfo {
	@IsString()
	number!: string;

	@IsString()
	hash!: string;

	@IsString()
	timestamp!: string;
}

class NFTApprovals {
	@IsArray()
	ERC721!: unknown[];

	@IsArray()
	ERC1155!: unknown[];
}

class MoralisWebhookRequest {
	@IsArray()
	abi!: unknown[];

	@ValidateNested()
	block!: BlockInfo;

	@IsArray()
	txs!: unknown[];

	@IsArray()
	txsInternal!: unknown[];

	@IsArray()
	logs!: unknown[];

	@IsHexadecimal()
	chainId!: string;

	@IsBoolean()
	confirmed!: boolean;

	@IsInt()
	retries!: number;

	@IsString()
	tag!: string;

	@IsString()
	streamId!: string;

	@IsArray()
	erc20Approvals!: unknown[];

	@IsArray()
	erc20Transfers!: unknown[];

	@IsArray()
	nftTokenApprovals!: unknown[];

	@ValidateNested()
	nftApprovals!: NFTApprovals;

	@IsArray()
	nftTransfers!: unknown[];

	@IsArray()
	nativeBalances!: unknown[];
}

interface TokenTxRepoAdapter {
	lockerId: number;
	contractAddress: `0x${string}`;
	txHash: `0x${string}`;
	fromAddress: `0x${string}`;
	toAddress: `0x${string}`;
	amount: bigint;
	chainId: number;
}

interface TokenTxInDb extends TokenTxRepoAdapter {
	id: number;
	createdAt: Date;
	updatedAt: Date;
}

export { MoralisWebhookRequest, type TokenTxInDb, type TokenTxRepoAdapter };
