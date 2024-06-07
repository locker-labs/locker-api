import { and, desc, eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import ITokenTxsRepo from "../../../usecases/interfaces/repos/tokenTxs";
import {
	ETokenTxLockerDirection,
	TokenTxInDb,
	TokenTxRepoAdapter,
} from "../../../usecases/schemas/tokenTxs";
import DuplicateRecordError from "../errors";
import { tokenTxs } from "../models/tokenTxs";

export default class TokenTxsRepo implements ITokenTxsRepo {
	// eslint-disable-next-line no-empty-function
	constructor(private db: PostgresJsDatabase) {}

	async create(tokenTx: TokenTxRepoAdapter): Promise<TokenTxInDb> {
		try {
			const result = await this.db
				.insert(tokenTxs)
				.values({
					lockerId: tokenTx.lockerId,
					lockerDirection: tokenTx.lockerDirection,
					contractAddress: tokenTx.contractAddress.toLowerCase(),
					txHash: tokenTx.txHash.toLowerCase(),
					tokenSymbol: tokenTx.tokenSymbol,
					tokenDecimals: tokenTx.tokenDecimals,
					fromAddress: tokenTx.fromAddress.toLowerCase(),
					toAddress: tokenTx.toAddress.toLowerCase(),
					isConfirmed: tokenTx.isConfirmed,
					amount: tokenTx.amount,
					chainId: tokenTx.chainId,
					automationsState: tokenTx.automationsState,
					triggeredByTokenTxId: tokenTx.triggeredByTokenTxId,
				})
				.onConflictDoUpdate({
					target: [tokenTxs.chainId, tokenTxs.txHash],
					set: {
						isConfirmed: tokenTx.isConfirmed,
						automationsState: tokenTx.automationsState,
						txHash: tokenTx.txHash,
						triggeredByTokenTxId: tokenTx.triggeredByTokenTxId,
					},
				})
				.returning();

			return result[0] as TokenTxInDb;
		} catch (error: unknown) {
			const e = error as { code?: string; message: string };
			if (e.code === "23505") {
				throw new DuplicateRecordError("tokenTx already exists.");
			}
			throw new Error(e.message);
		}
	}

	async retrieve(options: {
		id?: number;
		txHash?: string;
		chainId?: number;
	}): Promise<TokenTxInDb | null> {
		const conditions = [];

		if (options.id) {
			conditions.push(eq(tokenTxs.id, options.id));
		}

		if (options.txHash && options.chainId !== undefined) {
			// Ensure both address and chainId are provided
			conditions.push(eq(tokenTxs.txHash, options.txHash.toLowerCase()));
			conditions.push(eq(tokenTxs.chainId, options.chainId));
		}

		if (conditions.length === 0) {
			throw new Error("No valid identifier provided.");
		}

		const result = await this.db
			.select()
			.from(tokenTxs)
			.where(and(...conditions))
			.limit(1)
			.execute();

		console.log("Got response");
		console.log(result);
		return result.length > 0 ? (result[0] as TokenTxInDb) : null;
	}

	async retrieveMany(options: {
		lockerId: number;
		chainId?: number;
		lockerDirection?: ETokenTxLockerDirection;
	}): Promise<TokenTxInDb[]> {
		const conditions = [];

		// Same locker, required
		conditions.push(eq(tokenTxs.lockerId, options.lockerId));

		// Same chain, optional
		if (options.chainId) {
			conditions.push(eq(tokenTxs.chainId, options.chainId));
		}

		// Direction, optional
		if (options.lockerDirection) {
			conditions.push(
				eq(tokenTxs.lockerDirection, options.lockerDirection)
			);
		}

		const results = await this.db
			.select()
			.from(tokenTxs)
			.where(and(...conditions))
			.orderBy(desc(tokenTxs.createdAt));
		return results.map((result) => result as TokenTxInDb);
	}
}
