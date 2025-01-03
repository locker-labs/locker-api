import getOrCreateDatabase from "../infrastructure/db/connect";
import LockersRepo from "../infrastructure/db/repos/lockers";
import OffRampRepo from "../infrastructure/db/repos/offramp";
import PoliciesRepo from "../infrastructure/db/repos/policies";
import TokenTxsRepo from "../infrastructure/db/repos/tokenTxs";
import ILockersRepo from "../usecases/interfaces/repos/lockers";
import IOffRampRepo from "../usecases/interfaces/repos/offramp";
import IPoliciesRepo from "../usecases/interfaces/repos/policies";
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

async function getPoliciesRepo(): Promise<IPoliciesRepo> {
	const db = getOrCreateDatabase(logger);
	return new PoliciesRepo(db);
}

async function getOffRampRepo(): Promise<IOffRampRepo> {
	const db = getOrCreateDatabase(logger);
	return new OffRampRepo(db);
}

export { getLockersRepo, getOffRampRepo, getPoliciesRepo, getTokenTxsRepo };
