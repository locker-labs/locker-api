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
	// getOffRampRepo,
	getOffRampClient,
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

function getAddress(accountData: any, tokenId: string): string | undefined {
	return accountData.walletAddresses.find(
		(wallet: any) => wallet.asset === tokenId
	)?.depositInstructions.address;
}

// NOTES:
// in order to trigger this webhook:
// 1. create a beam account manually using their api (you'll receive a call back url)
// 2. add the callbalck url to the iFrame in testPage.html
// 3. render testPage.html in the brower and go through dummy kyc flow
// 4. when complete, beam will trigger this webhook (make sure you register it -- i use ngrok to expose my localhost)

// CURRENT STATUS:
// 1. right now, it receives webhook saying address got created
// 2. it then fetches the address for that chain

// NEXT STEPS:
// - update the beam acocunt in our database (the act of creating it will initially place it there)
// - store that address in the db when address is received
beamRouter.post(
	"/webhooks/onboarding",
	authRequired,
	validateRequest(BeamWebhookRequest),
	async (req: Request, res: Response): Promise<void> => {
		console.log(req.body);

		// const offRampRepo = await getOffRampRepo();
		const offRampClient = await getOffRampClient();

		const resourcePath = req.body.resources[0];
		const userId = resourcePath.split("/").pop();
		const resp = await offRampClient.getAccount(userId);

		let address;
		let tokenId;
		if (req.body.eventName === "User.Onboarding.Approved") {
			// update beam acocunt object in database (created elsewhere)
		} else if (
			req.body.eventName === "User.BeamAddress.Added.USDC.ARBITRUM"
		) {
			tokenId = "USDC.ARBITRUM";
			address = getAddress(resp, tokenId);
		} else if (req.body.eventName === "User.BeamAddress.Added.USDC.ETH") {
			tokenId = "USDC.ETH";
			address = getAddress(resp, tokenId);
		} else if (req.body.eventName === "User.BeamAddress.Added.USDC.AVAX") {
			tokenId = "USDC.AVAX";
			address = getAddress(resp, tokenId);
		} else if (
			req.body.eventName === "User.BeamAddress.Added.USDC.POLYGON"
		) {
			tokenId = "USDC.POLYGON";
			address = getAddress(resp, tokenId);
		} else if (req.body.eventName === "User.BeamAddress.Added.USDC.BASE") {
			tokenId = "USDC.BASE";
			address = getAddress(resp, tokenId);
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
