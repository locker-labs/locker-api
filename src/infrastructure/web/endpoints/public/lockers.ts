import "dotenv/config";

import { plainToClass } from "class-transformer";
import { validate } from "class-validator";
import express, {
	NextFunction,
	Request,
	RequestHandler,
	Response,
} from "express";
import morgan from "morgan";

import {
	AuthenticatedRequest,
	authRequired,
	getIndexerClient,
	getLockersRepo,
	logger,
	stream,
} from "../../../../dependencies";
import { getExecutorClient } from "../../../../dependencies/clients";
import ChainIds from "../../../../usecases/schemas/blockchains";
import {
	CreateLockerRequest,
	LockerRepoAdapter,
	UpdateLockerRepoAdapter,
	UpdateLockerRequest,
} from "../../../../usecases/schemas/lockers";
import DuplicateRecordError from "../../../db/errors";

const lockerRouter = express.Router();
lockerRouter.use(express.json());
lockerRouter.use(morgan("combined", { stream }));

function validateRequest<T extends object>(type: {
	new (): T;
}): RequestHandler {
	return async (
		req: AuthenticatedRequest<Request>,
		res: Response,
		next: NextFunction
	) => {
		const input = plainToClass(type, req.body);
		const errors = await validate(input);
		if (errors.length > 0) {
			res.status(400).json(errors);
		} else {
			req.body = input; // Optionally, replace the req.body with the validated object
			next();
		}
	};
}

lockerRouter.post(
	"/create",
	authRequired,
	validateRequest(CreateLockerRequest),
	async (
		req: AuthenticatedRequest<Request>,
		res: Response
	): Promise<void> => {
		// Useful to give different environments different seed ranges so that there's no collisions
		const defaultEnvironmentOffset = 0;
		const seedEnvironmentOffset =
			parseInt(process.env.LOCKER_SEED_OFFSET!) ||
			defaultEnvironmentOffset;
		const seed = req.body.seed + seedEnvironmentOffset;

		const address = await getExecutorClient().getKernelAddress({
			seed,
			eoaAddress: req.body.ownerAddress,
			// Kernel addresses are valid on all chains
			// We pick one arbitrarily
			chainId: ChainIds.BASE,
		});

		const locker: LockerRepoAdapter = {
			userId: req.auth.userId,
			seed,
			address,
			provider: req.body.provider,
			ownerAddress: req.body.ownerAddress,
		};

		// store locker in database
		const lockersRepo = await getLockersRepo();
		let lockerInDb;
		try {
			lockerInDb = await lockersRepo.create(locker);
		} catch (error) {
			if (error instanceof DuplicateRecordError) {
				res.status(409).send({
					error: (error as DuplicateRecordError).message,
				});
				return;
			}
			res.status(500).send({ error: "An unexpected error occurred." });
			return;
		}

		// add locker address to indexer
		const indexer = await getIndexerClient();
		await indexer.watchOnChain(locker.address);
		res.status(201).send({ data: { locker: lockerInDb } });
	}
);

lockerRouter.patch(
	"/:lockerId",
	authRequired,
	validateRequest(UpdateLockerRequest),
	async (
		req: AuthenticatedRequest<Request>,
		res: Response
	): Promise<void> => {
		// ensure that supplied locker exists
		const lockersRepo = await getLockersRepo();
		const locker = await lockersRepo.retrieve({
			id: parseInt(req.params.lockerId, 10),
		});

		if (!locker) {
			res.status(404).send({ error: "Locker not found." });
			return;
		}

		// update locker
		const lockerUpdate: UpdateLockerRepoAdapter = {
			ownerAddress: req.body.ownerAddress,
			chainId: req.body.chainId,
			deploymentTxHash: req.body.deploymentTxHash,
		};

		let updatedLocker;
		try {
			updatedLocker = await lockersRepo.update(
				parseInt(req.params.lockerId, 10),
				lockerUpdate
			);
			res.status(200).send({ data: { locker: updatedLocker } });
		} catch (error) {
			if (error instanceof DuplicateRecordError) {
				res.status(409).send({
					error: (error as DuplicateRecordError).message,
				});
				return;
			}
			res.status(500).send({ error: "An unexpected error occurred." });
		}
	}
);

lockerRouter.get(
	"/",
	authRequired,
	async (
		req: AuthenticatedRequest<Request>,
		res: Response
	): Promise<void> => {
		const lockersRepo = await getLockersRepo();
		const lockers = await lockersRepo.retrieveMany({
			userId: req.auth.userId,
		});
		res.status(200).json({ data: { lockers } });
	}
);

// note: needs to be below routes
lockerRouter.use(
	(
		err: Error,
		req: AuthenticatedRequest<Request>,
		res: Response,
		next: NextFunction
	): void => {
		logger.error(err.stack);
		res.status(401).send("Unauthenticated!");
		next();
	}
);

export default lockerRouter;
