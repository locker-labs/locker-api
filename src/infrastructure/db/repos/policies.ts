import { and, desc, eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import IPoliciesRepo from "../../../usecases/interfaces/repos/policies";
import {
	PoliciyRepoAdapter,
	PolicyInDb,
	PolicyInDbWithoutSessionKey,
	UpdatePoliciesRepoAdapter,
} from "../../../usecases/schemas/policies";
import DuplicateRecordError from "../errors";
import policies from "../models/policies";

export default class PoliciesRepo implements IPoliciesRepo {
	// eslint-disable-next-line no-empty-function
	constructor(private db: PostgresJsDatabase) {}

	async create(
		policy: PoliciyRepoAdapter
	): Promise<PolicyInDbWithoutSessionKey> {
		try {
			const result = await this.db
				.insert(policies)
				.values({
					lockerId: policy.lockerId,
					chainId: policy.chainId,
					encryptedSessionKey: policy.encryptedSessionKey,
					encodedIv: policy.encodedIv,
					automations: policy.automations,
				})
				.returning();

			const policyWithoutSessionKey: Partial<(typeof result)[0]> = {
				...result[0],
			};
			delete policyWithoutSessionKey.encryptedSessionKey;
			delete policyWithoutSessionKey.encodedIv;
			return policyWithoutSessionKey as PolicyInDbWithoutSessionKey;
		} catch (error: unknown) {
			const e = error as { code?: string; message: string };
			if (e.code === "23505") {
				throw new DuplicateRecordError("Policy already exists.");
			}

			throw new Error(e.message);
		}
	}

	async update(
		options: {
			id?: number;
			lockerId?: number;
			chainId?: number;
		},
		updates: UpdatePoliciesRepoAdapter
	): Promise<PolicyInDbWithoutSessionKey | null> {
		const conditions = [];

		if (options.id) {
			conditions.push(eq(policies.id, options.id));
		}

		if (options.lockerId && options.chainId !== undefined) {
			// Ensure both address and chainId are provided
			conditions.push(eq(policies.lockerId, options.lockerId));
			conditions.push(eq(policies.chainId, options.chainId));
		}

		if (conditions.length === 0) {
			throw new Error("No valid identifier provided.");
		}

		const result = await this.db
			.update(policies)
			.set(updates)
			.where(and(...conditions))
			.returning();

		if (result.length > 0) {
			const policyWithoutSessionKey: Partial<(typeof result)[0]> = {
				...result[0],
			};
			delete policyWithoutSessionKey.encryptedSessionKey;
			delete policyWithoutSessionKey.encodedIv;
			return policyWithoutSessionKey as PolicyInDbWithoutSessionKey;
		}
		return null;
	}

	async retrieve(
		options: {
			id?: number;
			lockerId?: number;
			chainId?: number;
		},
		withSessionKey: boolean
	): Promise<PolicyInDbWithoutSessionKey | PolicyInDb | null> {
		const conditions = [];

		if (options.id) {
			conditions.push(eq(policies.id, options.id));
		}

		if (options.lockerId && options.chainId !== undefined) {
			// Ensure both address and chainId are provided
			conditions.push(eq(policies.lockerId, options.lockerId));
			conditions.push(eq(policies.chainId, options.chainId));
		}

		if (conditions.length === 0) {
			throw new Error("No valid identifier provided.");
		}

		const result = await this.db
			.select()
			.from(policies)
			.where(and(...conditions))
			.limit(1)
			.execute();

		if (result.length > 0) {
			if (withSessionKey) {
				return result[0] as PolicyInDb;
			}
			const policyWithoutSessionKey: Partial<(typeof result)[0]> = {
				...result[0],
			};
			delete policyWithoutSessionKey.encryptedSessionKey;
			delete policyWithoutSessionKey.encodedIv;
			return policyWithoutSessionKey as PolicyInDbWithoutSessionKey;
		}
		return null;
	}

	async retrieveMany(
		lockerId: number
	): Promise<PolicyInDbWithoutSessionKey[]> {
		const results = await this.db
			.select()
			.from(policies)
			.where(eq(policies.lockerId, lockerId))
			.orderBy(desc(policies.createdAt));

		return results.map((result) => {
			const policyWithoutSessionKey: Partial<typeof result> = {
				...result,
			};
			delete policyWithoutSessionKey.encryptedSessionKey;
			delete policyWithoutSessionKey.encodedIv;
			return policyWithoutSessionKey as PolicyInDbWithoutSessionKey;
		});
	}
}
