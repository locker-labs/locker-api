import {
	OffRampInDb,
	OffRampRepoAdapter,
	OffRampRepoUpdateAdapter,
} from "../../schemas/offramp";

export default interface IOffRampRepo {
	create(offRamp: OffRampRepoAdapter): Promise<OffRampInDb>;
	update(
		offRampAccountId: string,
		updates: OffRampRepoUpdateAdapter
	): Promise<void>;
	retrieve(filter: {
		id?: number | null;
		beamAccountId?: string | null;
		lockerId?: number | null;
	}): Promise<OffRampInDb | null>;
	createOffRampAddress(
		offRampId: number,
		chainId: number,
		address: string
	): Promise<void>;
}
