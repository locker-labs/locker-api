import { desc, eq, or } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

import ITokenTxsRepo from "../../../usecases/interfaces/repos/tokenTxs";
import {
	TokenTxInDb,
	TokenTxRepoAdapter,
} from "../../../usecases/schemas/tokenTxs";
import DuplicateRecordError from "../errors";
import { tokenTxs } from "../models/tokenTxs";

export default class TokenTxsRepo implements ITokenTxsRepo {
	// eslint-disable-next-line no-empty-function
	constructor(private db: NodePgDatabase) {}

	async create(tokenTx: TokenTxRepoAdapter): Promise<TokenTxInDb> {
		try {
			const result = await this.db
				.insert(tokenTxs)
				.values({
					lockerId: tokenTx.lockerId,
					contractAddress: tokenTx.contractAddress,
					txHash: tokenTx.txHash,
					fromAddress: tokenTx.fromAddress,
					toAddress: tokenTx.toAddress,
					amount: tokenTx.amount,
					chainId: tokenTx.chainId,
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
			conditions.push(eq(tokenTxs.txHash, options.txHash));
			conditions.push(eq(tokenTxs.chainId, options.chainId));
		}

		if (conditions.length === 0) {
			throw new Error("No valid identifier provided.");
		}

		const result = await this.db
			.select()
			.from(tokenTxs)
			.where(or(...conditions))
			.limit(1)
			.execute();

		return result.length > 0 ? (result[0] as TokenTxInDb) : null;
	}

	async retrieveMany(options: { lockerId: number }): Promise<TokenTxInDb[]> {
		const results = await this.db
			.select()
			.from(tokenTxs)
			.where(eq(tokenTxs.lockerId, options.lockerId))
			.orderBy(desc(tokenTxs.createdAt));
		return results.map((result) => result as TokenTxInDb);
	}
}
