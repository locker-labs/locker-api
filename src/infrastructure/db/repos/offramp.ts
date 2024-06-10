import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import IOffRampRepo from "../../../usecases/interfaces/repos/offramp";

import DuplicateRecordError from "../errors";
import { offrampAccount } from "../models/offramp";
import {
	OffRampRepoAdapter,
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
}
