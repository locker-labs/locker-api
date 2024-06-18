import ILockersRepo from "../../src/usecases/interfaces/repos/lockers";
import {
	LockerInDb,
	LockerRepoAdapter,
	UpdateLockerRepoAdapter,
} from "../../src/usecases/schemas/lockers";

export default class TestLockersRepo implements ILockersRepo {
	create(locker: LockerRepoAdapter): Promise<LockerInDb> {
		throw new Error("Method not implemented.");
	}

	retrieve(options: {
		address?: string | undefined;
		id?: number | undefined;
	}): Promise<LockerInDb | null> {
		throw new Error("Method not implemented.");
	}

	retrieveMany(options: {
		userId?: string | undefined;
		ownerAddress?: string | undefined;
	}): Promise<LockerInDb[]> {
		throw new Error("Method not implemented.");
	}

	update(
		lockerId: number,
		updates: UpdateLockerRepoAdapter
	): Promise<LockerInDb | null> {
		throw new Error("Method not implemented.");
	}
}
