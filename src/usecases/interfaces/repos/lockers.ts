import { LockerInDb, LockerRepoAdapter } from "../../schemas/lockers";

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
}
