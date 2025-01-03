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
	getAuthClient,
	getLockersRepo,
	getOffRampClient,
	getOffRampRepo,
	logger,
	stream,
} from "../../../../dependencies";
import {
	CreateOfframpRequest,
	EOffRampAccountStatus,
	OffRampRepoAdapter,
} from "../../../../usecases/schemas/offramp";
import DuplicateRecordError from "../../../db/errors";

const offrampRouter = express.Router();
offrampRouter.use(express.json());
offrampRouter.use(morgan("combined", { stream }));

function validateRequest<T extends object>(type: {
	new (): T;
}): RequestHandler {
	console.log("Validating request");
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
			// Optionally, replace the req.body with the validated object
			req.body = input;
			next();
		}
	};
}

offrampRouter.post(
	"/create",
	authRequired,
	validateRequest(CreateOfframpRequest),
	async (
		req: AuthenticatedRequest<Request>,
		res: Response
	): Promise<void> => {
		console.log("Creating offramp account");
		console.log(req.body);
		// 1. retrive locker based on address
		const lockersRepo = await getLockersRepo();
		const locker = await lockersRepo.retrieve({
			address: req.body.address,
		});

		if (!locker) {
			res.status(404).send({ error: "Locker not found." });
			return;
		}

		// 2. ensure offramp account doesn't already exist
		const offRampRepo = await getOffRampRepo();
		const beamAccount = await offRampRepo.retrieve({ lockerId: locker.id });

		// 3. Create beam account
		const authClient = await getAuthClient();
		const user = await authClient.getUser(locker!.userId);
		const offRampClient = await getOffRampClient();
		const resp = await offRampClient.createAccount(
			user.emailAddresses[0].emailAddress,
			req.body.address
		);
		console.log("Created account");
		console.log(resp);

		const { onboardingUrl, userId: beamAccountId } = resp;

		if (beamAccount) {
			console.log("Beam account already created for locker");
			if (beamAccount.beamAccountId !== beamAccountId) {
				const msg = `Beam account ${beamAccount.beamAccountId} already created for this Locker but got a new one ${beamAccountId}.`;
				console.log(msg);
				res.status(409).send({
					error: msg,
				});
				return;
			}
			// res.status(409).send({
			// 	error: "Beam account already created for this Locker.",
			// });
			// return;
		}

		// 3. Store beam account in database
		const offRampAccount: OffRampRepoAdapter = {
			lockerId: locker!.id,
			beamAccountId,
			status: EOffRampAccountStatus.PENDING,
			onboardingUrl,
		};

		let offrampAccountInDb;
		try {
			console.log("Creating offramp account in db");
			console.log(offRampAccount);
			offrampAccountInDb = await offRampRepo.create(offRampAccount);
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
		res.status(200).send({
			offrampAccount: offrampAccountInDb,
			onboardingUrl,
		});
	}
);

// note: needs to be below routes
offrampRouter.use(
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

export default offrampRouter;
