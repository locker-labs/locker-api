import {
	LockerInDb,
	LockerRepoAdapter,
	UpdateLockerRepoAdapter,
} from "../../schemas/lockers";

export default interface ILockersRepo {
	create(locker: LockerRepoAdapter): Promise<LockerInDb>;
	retrieve(options: {
		address?: string;
		id?: number;
		chainId?: number;
	}): Promise<LockerInDb | null>;
	retrieveMany(options: {
		userId?: string;
		ownerAddress?: string;
	}): Promise<LockerInDb[]>;
	update(
		lockerId: number,
		updates: UpdateLockerRepoAdapter
	): Promise<LockerInDb | null>;
}
