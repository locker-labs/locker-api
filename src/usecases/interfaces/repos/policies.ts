import {
	PoliciyRepoAdapter,
	PolicyInDbWithoutSessionKey,
	UpdatePoliciesRepoAdapter,
} from "../../schemas/policies";

export default interface ILockersRepo {
	create(policy: PoliciyRepoAdapter): Promise<PolicyInDbWithoutSessionKey>;
	retrieve(
		options: {
			id?: number;
			lockerId?: number;
			chainId?: number;
		},
		withSessionKey: boolean
	): Promise<PolicyInDbWithoutSessionKey | null>;
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
