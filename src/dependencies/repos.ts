import getOrCreateDatabase from "../infrastructure/db/connect";
import LockersRepo from "../infrastructure/db/repos/lockers";
import ILockersRepo from "../usecases/interfaces/repos/lockers";
import { logger } from "./logger";

async function getLockersRepo(): Promise<ILockersRepo> {
	const db = getOrCreateDatabase(logger);
	return new LockersRepo(db);
}

async function getOtherRepo(): Promise<ILockersRepo> {
	const db = getOrCreateDatabase(logger);
	return new LockersRepo(db);
}

export { getLockersRepo, getOtherRepo };
