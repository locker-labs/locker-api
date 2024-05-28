import {
	PolicyInDb,
	PolicyInDbWithoutSessionKey,
	PolicyRepoAdapter,
	UpdatePoliciesRepoAdapter,
} from "../../schemas/policies";

export default interface IPoliciesRepo {
	create(policy: PolicyRepoAdapter): Promise<PolicyInDbWithoutSessionKey>;
	retrieve(
		options: {
			id?: number;
			lockerId?: number;
			chainId?: number;
		},
		withSessionKey: boolean
	): Promise<PolicyInDbWithoutSessionKey | PolicyInDb | null>;
	retrieveMany(lockerId: number): Promise<PolicyInDbWithoutSessionKey[]>;
	update(
		options: {
			id?: number;
			lockerId?: number;
			chainId?: number;
		},
		updates: UpdatePoliciesRepoAdapter
	): Promise<PolicyInDbWithoutSessionKey | null>;
}
