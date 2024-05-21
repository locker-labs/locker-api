import IPoliciesRepo from "../../src/usecases/interfaces/repos/policies";
import {
	IAutomation,
	PolicyInDb,
	PolicyInDbWithoutSessionKey,
	PolicyRepoAdapter,
	UpdatePoliciesRepoAdapter,
} from "../../src/usecases/schemas/policies";

export default class TestPolicyApi implements IPoliciesRepo {
	create(policy: PolicyRepoAdapter): Promise<PolicyInDbWithoutSessionKey> {
		throw new Error("Method not implemented.");
	}

	retrieve(
		options: {
			id?: number | undefined;
			lockerId?: number | undefined;
			chainId?: number | undefined;
		},
		withSessionKey: boolean
	): Promise<PolicyInDbWithoutSessionKey | PolicyInDb | null> {
		const automations: IAutomation[] = [
			{
				type: "savings",
				allocationFactor: 0.1,
				status: "ready",
			},
			{
				type: "forward_to",
				allocationFactor: 0.2,
				status: "ready",
				recipientAddress: "0x123",
			},
			{
				type: "off_ramp",
				allocationFactor: 0.3,
				status: "ready",
				recipientAddress: "0x456",
			},
			{
				type: "off_ramp",
				allocationFactor: 0.5,
				status: "new",
				recipientAddress: "0x789",
			},
		];

		if (withSessionKey) {
			const policy: PolicyInDb = {
				id: 1,
				lockerId: options.lockerId!,
				chainId: options.chainId!,
				automations,
				createdAt: new Date(),
				updatedAt: new Date(),
				encryptedSessionKey: "test",
				encodedIv: "test",
			};
			return Promise.resolve(policy);
		}
		const policy = {
			id: 1,
			lockerId: options.lockerId!,
			chainId: options.chainId!,
			automations,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		return Promise.resolve(policy);
	}

	retrieveMany(lockerId: number): Promise<PolicyInDbWithoutSessionKey[]> {
		throw new Error("Method not implemented.");
	}

	update(
		options: {
			id?: number | undefined;
			lockerId?: number | undefined;
			chainId?: number | undefined;
		},
		updates: UpdatePoliciesRepoAdapter
	): Promise<PolicyInDbWithoutSessionKey | null> {
		throw new Error("Method not implemented.");
	}
}
