import IOffRampRepo from "../../src/usecases/interfaces/repos/offramp";
import {
	OffRampInDb,
	OffRampRepoAdapter,
	OffRampRepoUpdateAdapter,
} from "../../src/usecases/schemas/offramp";

export default class TestOffRampRepo implements IOffRampRepo {
	getAddressOffRampAddress(
		offRampAccountId: number,
		chainId: number
	): Promise<string | null> {
		throw new Error("Method not implemented.");
	}
	create(offRamp: OffRampRepoAdapter): Promise<OffRampInDb> {
		throw new Error("Method not implemented.");
	}

	update(
		offRampAccountId: string,
		updates: OffRampRepoUpdateAdapter
	): Promise<void> {
		throw new Error("Method not implemented.");
	}

	retrieve(filter: {
		id?: number | null;
		beamAccountId?: string | null;
		lockerId?: number | null;
	}): Promise<OffRampInDb | null> {
		throw new Error("Method not implemented.");
	}

	createOffRampAddress(
		offRampId: number,
		chainId: number,
		address: string
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
}
