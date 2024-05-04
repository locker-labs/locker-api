import ILockersRepo from "../core/interfaces/repos/lockers";
import getOrCreateDatabase from "../periphery/db/connect";
import LockersRepo from "../periphery/db/repos/lockers";
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
