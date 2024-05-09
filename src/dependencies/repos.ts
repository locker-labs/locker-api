import getOrCreateDatabase from "../infrastructure/db/connect";
import LockersRepo from "../infrastructure/db/repos/lockers";
import TokenTxsRepo from "../infrastructure/db/repos/tokenTxs";
import ILockersRepo from "../usecases/interfaces/repos/lockers";
import ITokenTxsRepo from "../usecases/interfaces/repos/tokenTxs";
import { logger } from "./logger";

async function getLockersRepo(): Promise<ILockersRepo> {
	const db = getOrCreateDatabase(logger);
	return new LockersRepo(db);
}

async function getTokenTxsRepo(): Promise<ITokenTxsRepo> {
	const db = getOrCreateDatabase(logger);
	return new TokenTxsRepo(db);
}

export { getLockersRepo, getTokenTxsRepo };
