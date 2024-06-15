import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and } from "drizzle-orm";

import IOffRampRepo from "../../../usecases/interfaces/repos/offramp";

import DuplicateRecordError from "../errors";
import { offrampAccount, offRampAddresses } from "../models/offramp";
import {
	OffRampRepoAdapter,
	OffRampRepoUpdateAdapter,
	OffRampInDb,
} from "../../../usecases/schemas/offramp";

export default class OffRampRepo implements IOffRampRepo {
	constructor(private db: PostgresJsDatabase) {}

	async create(offRamp: OffRampRepoAdapter): Promise<OffRampInDb> {
		try {
			const result = await this.db
				.insert(offrampAccount)
				.values({
					lockerId: offRamp.lockerId,
					beamAccountId: offRamp.beamAccountId,
					status: offRamp.status,
					errors: offRamp.errors,
				})
				.onConflictDoUpdate({
					target: [offrampAccount.beamAccountId],
					set: {
						status: offRamp.status,
						errors: offRamp.errors,
					},
				})
				.returning();

			return result[0] as OffRampInDb;
		} catch (error: unknown) {
			const e = error as { code?: string; message: string };
			if (e.code === "23505") {
				throw new DuplicateRecordError(
					"OffRamp account already exists."
				);
			}
			throw new Error(e.message);
		}
	}

	async update(
		offRampAccountId: string,
		updates: OffRampRepoUpdateAdapter
	): Promise<void> {
		if (Object.keys(updates).length === 0) {
			throw new Error("No updates provided.");
		}

		const updatesCopy = { ...updates };

		await this.db
			.update(offrampAccount)
			.set(updatesCopy)
			.where(eq(offrampAccount.beamAccountId, offRampAccountId));
	}

	async retrieve(filter: {
		id?: number | null;
		beamAccountId?: string | null;
		lockerId?: number | null;
	}): Promise<OffRampInDb | null> {
		const conditions = [];

		if (filter.id) {
			conditions.push(eq(offrampAccount.id, filter.id));
		}

		if (filter.lockerId) {
			conditions.push(eq(offrampAccount.lockerId, filter.lockerId));
		}

		if (filter.beamAccountId) {
			conditions.push(
				eq(offrampAccount.beamAccountId, filter.beamAccountId)
			);
		}

		if (conditions.length === 0) {
			throw new Error("No valid identifier provided.");
		}

		const result = await this.db
			.select()
			.from(offrampAccount)
			.where(and(...conditions))
			.limit(1)
			.execute();

		return result.length > 0 ? (result[0] as OffRampInDb) : null;
	}

	async createOffRampAddress(
		offRampId: number,
		chainId: number,
		address: string
	): Promise<void> {
		try {
			await this.db
				.insert(offRampAddresses)
				.values({
					offRampAccountId: offRampId,
					chainId: chainId,
					address: address,
				})
				.onConflictDoNothing();
		} catch (error: unknown) {
			const e = error as { code?: string; message: string };
			if (e.code === "23505") {
				throw new DuplicateRecordError(
					"Address with this chainId already exists."
				);
			}
			throw new Error(e.message);
		}
	}
}
