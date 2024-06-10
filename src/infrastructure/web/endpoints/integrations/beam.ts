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
import basicAuth from "basic-auth";

import {
	logger,
	stream,
	//getOffRampRepo
} from "../../../../dependencies";

import BeamWebhookRequest from "../../../../usecases/schemas/BeamWebhookRequest";
// import { OffRampRepoAdapter } from "../../../../usecases/schemas/offramp";

// import DuplicateRecordError from "../../../db/errors";

const beamRouter = express.Router();
beamRouter.use(express.json());
beamRouter.use(morgan("combined", { stream }));

interface AuthenticatedRequest<T> extends Request {
	user?: any;
}

const authRequired = (req: Request, res: Response, next: NextFunction) => {
	const credentials = basicAuth(req);

	if (
		!credentials ||
		credentials.name !== "beamUsername" ||
		credentials.pass !== "beamPassword"
	) {
		res.setHeader("WWW-Authenticate", 'Basic realm="example"');
		return res.status(401).send("Access denied");
	}

	next();
	return;
};

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

// 1. when a user creates an account through our API, we'll receive id and tie to a locker object in our db
// 2. we will then receive that same id here in this webhook
//    --> this means that all operations here will be "updates" to the database, not "creates"
beamRouter.post(
	"/webhooks/onboarding",
	authRequired,
	validateRequest(BeamWebhookRequest),
	async (req: Request, res: Response): Promise<void> => {
		console.log(req.body);

		// const offRampRepo = await getOffRampRepo();

		if (req.body.eventName === "User.Onboarding.Submitted") {
			// something
		} else if (req.body.eventName === "User.Onboarding.Approved") {
			// something
		} else if (req.body.eventName === "User.Onboarding.Rejected") {
			// something
		}

		res.status(200).send();
	}
);

// note: needs to be below routes
beamRouter.use(
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

export default beamRouter;
