import { OffRampInDb, OffRampRepoAdapter } from "../../schemas/offramp";

export default interface IOffRampRepo {
	create(offRamp: OffRampRepoAdapter): Promise<OffRampInDb>;
}
