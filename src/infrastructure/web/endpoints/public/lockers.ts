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
	getLockersRepo,
	logger,
	stream,
} from "../../../../dependencies";
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
		const locker: LockerRepoAdapter = {
			userId: req.auth.userId,
			seed: req.body.seed,
			provider: req.body.provider,
			ownerAddress: req.body.ownerAddress,
			address: req.body.address,
			chainId: req.body.chainId,
		};

		const lockersRepo = await getLockersRepo();

		try {
			const lockerInDb = await lockersRepo.create(locker);
			res.status(201).send({ data: lockerInDb });
		} catch (error) {
			if (error instanceof DuplicateRecordError) {
				res.status(409).send({ error: error.message });
			}
		}
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
		const lockerUpdate: UpdateLockerRepoAdapter = {
			ownerAddress: req.body.ownerAddress,
			deploymentTxHash: req.body.deploymentTxHash,
		};

		const lockersRepo = await getLockersRepo();

		const updatedLocker = await lockersRepo.update(
			parseInt(req.params.lockerId, 10),
			lockerUpdate
		);

		if (!updatedLocker) {
			res.status(404).send({ error: "Locker not found." });
		} else {
			res.status(200).send({ data: updatedLocker });
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
		res.status(200).json({ data: lockers });
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
