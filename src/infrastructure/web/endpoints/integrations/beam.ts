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
	getOffRampRepo,
	getOffRampClient,
} from "../../../../dependencies";

import BeamWebhookRequest from "../../../../usecases/schemas/BeamWebhookRequest";
import {
	OffRampRepoUpdateAdapter,
	EOffRampAccountStatus,
} from "../../../../usecases/schemas/offramp";
import ChainIds from "../../../../usecases/schemas/blockchains";
import IOffRampRepo from "../../../../usecases/interfaces/repos/offramp";

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

async function handleOnboardingEvent(
	eventName: string,
	offRampAccountId: string,
	offRampRepo: IOffRampRepo
): Promise<void> {
	let status: EOffRampAccountStatus;

	if (eventName === "User.Onboarding.Approved") {
		status = EOffRampAccountStatus.APPROVED;
	} else if (eventName === "User.Onboarding.Rejected") {
		status = EOffRampAccountStatus.REJECTED;
	} else {
		throw new Error("Unsupported onboarding event");
	}

	const offRampAccountUpdates: OffRampRepoUpdateAdapter = {
		status: status,
		errors: null,
	};

	await offRampRepo.update(offRampAccountId, offRampAccountUpdates);
}

async function handleAddressAddedEvent(
	eventName: string,
	resp: any,
	offRampAccountId: string,
	offRampRepo: IOffRampRepo
): Promise<void> {
	const tokenIdMap: { [key: string]: { tokenId: string; chainId: number } } =
		{
			"User.BeamAddress.Added.USDC.ARBITRUM": {
				tokenId: "USDC.ARBITRUM",
				chainId: ChainIds.ARBITRUM,
			},
			"User.BeamAddress.Added.USDC.ETH": {
				tokenId: "USDC.ETH",
				chainId: ChainIds.ETHEREUM,
			},
			"User.BeamAddress.Added.USDC.AVAX": {
				tokenId: "USDC.AVAX",
				chainId: ChainIds.AVALANCHE,
			},
			"User.BeamAddress.Added.USDC.POLYGON": {
				tokenId: "USDC.POLYGON",
				chainId: ChainIds.POLYGON,
			},
			"User.BeamAddress.Added.USDC.BASE": {
				tokenId: "USDC.BASE",
				chainId: ChainIds.BASE,
			},
		};

	const tokenInfo = tokenIdMap[eventName];
	if (!tokenInfo) {
		return;
	}

	const offRampAccount = await offRampRepo.retrieve({
		beamAccountId: offRampAccountId,
	});

	const address = getAddress(resp, tokenInfo.tokenId);

	await offRampRepo.createOffRampAddress(
		offRampAccount!.id,
		tokenInfo.chainId,
		address!
	);
}

// NOTES:
// in order to trigger this webhook:
// 1. create a beam account manually using their api (you'll receive a call back url)
// 2. add the callbalck url to the iFrame in testPage.html
// 3. render testPage.html in the brower and go through dummy kyc flow
// 4. when complete, beam will trigger this webhook (make sure you register it -- i use ngrok to expose my localhost)
beamRouter.post(
	"/webhooks/onboarding",
	authRequired,
	validateRequest(BeamWebhookRequest),
	async (req: Request, res: Response): Promise<void> => {
		const offRampRepo = await getOffRampRepo();
		const offRampClient = await getOffRampClient();

		const resourcePath = req.body.resources[0];
		const offRampAccountId = resourcePath.split("/").pop();
		const resp = await offRampClient.getAccount(offRampAccountId);

		try {
			if (req.body.eventName.startsWith("User.Onboarding.")) {
				await handleOnboardingEvent(
					req.body.eventName,
					offRampAccountId,
					offRampRepo
				);
			} else if (
				req.body.eventName.startsWith("User.BeamAddress.Added.")
			) {
				await handleAddressAddedEvent(
					req.body.eventName,
					resp,
					offRampAccountId,
					offRampRepo
				);
			} else {
				throw new Error("Unsupported event");
			}

			res.status(200).send();
		} catch (error: any) {
			console.error(error);
			res.status(500).send({ error: error.message });
		}
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
