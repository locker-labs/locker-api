import { and, eq, or } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

import ILockersRepo from "../../../usecases/interfaces/repos/lockers";
import {
	LockerInDb,
	LockerRepoAdapter,
} from "../../../usecases/schemas/lockers";
import DuplicateRecordError from "../errors";
import lockers from "../models/lockers";

export default class LockersRepo implements ILockersRepo {
	// eslint-disable-next-line no-empty-function
	constructor(private db: NodePgDatabase) {}

	async create(locker: LockerRepoAdapter): Promise<LockerInDb> {
		try {
			const result = await this.db
				.insert(lockers)
				.values({
					userId: locker.userId,
					seed: locker.seed,
					provider: locker.provider,
					ownerAddress: locker.ownerAddress,
					address: locker.address,
					chainId: locker.chainId,
				})
				.returning();

			return result[0] as LockerInDb;
		} catch (error: unknown) {
			const e = error as { code?: string; message: string };
			if (e.code === "23505") {
				throw new DuplicateRecordError("Locker already exists.");
			}
			throw new Error(e.message);
		}
	}

	async retrieve(options: {
		address?: string;
		id?: number;
		chainId?: number;
	}): Promise<LockerInDb | null> {
		const conditions = [];

		if (options.id) {
			conditions.push(eq(lockers.id, options.id));
		}

		if (options.address && options.chainId !== undefined) {
			// Ensure both address and chainId are provided
			conditions.push(eq(lockers.address, options.address));
			conditions.push(eq(lockers.chainId, options.chainId));
		}

		if (conditions.length === 0) {
			throw new Error("No valid identifier provided.");
		}

		const result = await this.db
			.select()
			.from(lockers)
			.where(or(...conditions))
			.limit(1)
			.execute();

		return result.length > 0 ? (result[0] as LockerInDb) : null;
	}

	async retrieveMany(options: {
		userId?: string;
		ownerAddress?: string;
	}): Promise<LockerInDb[]> {
		const conditions = [];

		if (options.userId !== undefined) {
			conditions.push(eq(lockers.userId, options.userId));
		}

		if (options.ownerAddress) {
			conditions.push(eq(lockers.ownerAddress, options.ownerAddress));
		}

		if (conditions.length === 0) {
			throw new Error("No valid conditions provided.");
		}

		const results = await this.db
			.select()
			.from(lockers)
			.where(and(...conditions));

		return results.map((result) => result as LockerInDb);
	}
}
