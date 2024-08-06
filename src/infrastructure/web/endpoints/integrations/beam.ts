import "dotenv/config";

import basicAuth from "basic-auth";
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
	getLockersRepo,
	getOffRampClient,
	getOffRampRepo,
	getPoliciesRepo,
	logger,
	stream,
} from "../../../../dependencies";
import supabase from "../../../../lib/supabase";
import ILockersRepo from "../../../../usecases/interfaces/repos/lockers";
import IOffRampRepo from "../../../../usecases/interfaces/repos/offramp";
import IPoliciesRepo from "../../../../usecases/interfaces/repos/policies";
import BeamWebhookRequest from "../../../../usecases/schemas/BeamWebhookRequest";
import ChainIds from "../../../../usecases/schemas/blockchains";
import {
	EOffRampAccountStatus,
	OffRampRepoUpdateAdapter,
} from "../../../../usecases/schemas/offramp";
import {
	EAutomationStatus,
	EAutomationType,
} from "../../../../usecases/schemas/policies";
// import DuplicateRecordError from "../../../db/errors";

const beamRouter = express.Router();
beamRouter.use(express.json());
beamRouter.use(morgan("combined", { stream }));

interface IAuthenticatedRequest extends Request {
	// user?: any;
}

const authRequired = (req: Request, res: Response, next: NextFunction) => {
	const credentials = basicAuth(req);

	if (
		!credentials ||
		credentials.name !== process.env.BEAM_USERNAME ||
		credentials.pass !== process.env.BEAM_PASSWORD
	) {
		res.setHeader("WWW-Authenticate", 'Basic realm="example"');
		return res.status(401).send("Access denied");
	}

	return next();
};

function validateRequest<T extends object>(type: {
	new (): T;
}): RequestHandler {
	return async (
		req: IAuthenticatedRequest,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAddress(accountData: any, tokenId: string): string | undefined {
	return accountData.walletAddresses.find(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(wallet: any) => wallet.asset === tokenId
	)?.depositInstructions.address;
}

async function updateAutomations(
	lockerId: number,
	policiesRepo: IPoliciesRepo
) {
	const policies = await policiesRepo.retrieveMany(lockerId);
	// eslint-disable-next-line no-restricted-syntax
	for (const policy of policies) {
		const { automations } = policy;
		// eslint-disable-next-line no-restricted-syntax
		for (const automation of policy.automations) {
			if (automation.type === EAutomationType.OFF_RAMP) {
				automation.status = EAutomationStatus.READY;
			}
		}
		// eslint-disable-next-line no-await-in-loop
		await policiesRepo.update({ id: policy.id }, { automations });
	}
}

function parseFirstUUID(input: string): string | null {
	const regex =
		/\b[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}\b/;
	const match = input.match(regex);
	return match ? match[0] : null;
}

async function handleOnboardingEvent(
	eventName: string,
	offRampAccountId: string,
	offRampRepo: IOffRampRepo,
	lockersRepo: ILockersRepo,
	policiesRepo: IPoliciesRepo
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
		status,
		errors: null,
	};

	const offRampAccount = await offRampRepo.retrieve({
		beamAccountId: offRampAccountId,
	});

	if (offRampAccount) {
		// 1. Update beam account status
		await offRampRepo.update(offRampAccountId, offRampAccountUpdates);

		// 2. Update automation status
		// const locker = await lockersRepo.retrieve({ id: offRampAccount!.lockerId });
		await updateAutomations(offRampAccount!.lockerId, policiesRepo);
	} else {
		console.log(
			`Could not find offRampAccount with beamAccountId: ${offRampAccountId}. Skipping onboarding event.`
		);
	}
}

async function handleAddressAddedEvent(
	eventName: string,
	resp: unknown,
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

	if (offRampAccount) {
		const address = getAddress(resp, tokenInfo.tokenId);

		await offRampRepo.createOffRampAddress(
			offRampAccount!.id,
			tokenInfo.chainId,
			address!
		);
	} else {
		console.log(
			`Could not find offRampAccount with beamAccountId: ${offRampAccountId}. Skipping address added event.`
		);
	}
}

// NOTES:
// in order to trigger this webhook:
// 1. create a beam account manually using their api (you'll receive a call back url)
// 2. add the callback url to the iFrame in testPage.html
// 3. render testPage.html in the browser and go through dummy kyc flow
// 4. when complete, beam will trigger this webhook (make sure you register it -- i use ngrok to expose my localhost)
// console.log(authRequired, validateRequest, BeamWebhookRequest);
beamRouter.post(
	"/webhook",
	authRequired,
	validateRequest(BeamWebhookRequest),
	async (req: Request, res: Response): Promise<void> => {
		const offRampRepo = await getOffRampRepo();
		const lockerRepo = await getLockersRepo();
		const policiesRepo = await getPoliciesRepo();
		const offRampClient = await getOffRampClient();

		console.log("\n\nGot beam webhook: ", req.body, "\n\n");

		const resourcePath = req.body.resources[0];
		const beamAccountId = parseFirstUUID(resourcePath);

		await supabase.from("offramp_events").insert({
			beam_account_id: beamAccountId,
			type: req.body.eventName,
			payload: req.body,
		});

		if (!beamAccountId) {
			console.log(
				"Could not find UUID in resource path, skipping.",
				resourcePath
			);
			res.status(200).send();
			return;
		}
		console.log("\n\noffRampAccountId: ", beamAccountId, "\n\n");
		const resp = await offRampClient.getAccount(beamAccountId);

		try {
			if (req.body.eventName.startsWith("User.Onboarding.")) {
				console.log("processing onboarding event");
				await handleOnboardingEvent(
					req.body.eventName,
					beamAccountId,
					offRampRepo,
					lockerRepo,
					policiesRepo
				);
			} else if (
				req.body.eventName.startsWith("User.BeamAddress.Added.")
			) {
				console.log("processing new address");
				await handleAddressAddedEvent(
					req.body.eventName,
					resp,
					beamAccountId,
					offRampRepo
				);
			} else if (req.body.eventName === "User.Deposit") {
				console.log("\n\nWE MADE IT TO THE DEPOSIT EVENT");
				console.log(req.body);
			} else if (req.body.eventName === "Beam.Deposit.Approved") {
				// {
				// 	id: '54f6f16c-f631-4308-8010-a1f1775b0eba',
				// 	eventName: 'Beam.Deposit.Approved',
				// 	partnerId: 'df803fcb-34f0-413d-99ef-dc777e88e6a4',
				// 	createdAt: '2024-06-20T05:42:54.249Z',
				// 	resources: [
				// 	  'users/c97a214e-b274-465a-bf6a-0c78a09e77fc/deposits/4077cde2-ebad-4d66-b519-31c747c7416d'
				// 	]
				//   }
			} else if (req.body.eventName === "Beam.Deposit.Detected") {
				// {
				// 	id: '6e3b01c4-5cf9-4adc-a516-e09f6ee812f5',
				// 	eventName: 'Beam.Deposit.Detected',
				// 	partnerId: 'df803fcb-34f0-413d-99ef-dc777e88e6a4',
				// 	createdAt: '2024-06-20T05:42:46.695Z',
				// 	resources: [
				// 	  'users/c97a214e-b274-465a-bf6a-0c78a09e77fc/deposits/4077cde2-ebad-4d66-b519-31c747c7416d'
				// 	]
				//   }
			} else if (req.body.eventName === "Beam.Payment.Initiated") {
				// {
				// 	id: '65ddf453-1f54-408e-8ef4-2ec69f44ec5f',
				// 	eventName: 'Beam.Payment.Initiated',
				// 	partnerId: 'df803fcb-34f0-413d-99ef-dc777e88e6a4',
				// 	createdAt: '2024-06-20T05:50:11.932Z',
				// 	resources: [
				// 	  'users/c97a214e-b274-465a-bf6a-0c78a09e77fc/deposits/beac6b84-508e-4f47-a3f8-d4c5ef2de83c'
				// 	]
				//   }
			} else {
				console.log("Could not process something");
				console.log(req.body);
				throw new Error("Unsupported event");
			}

			res.status(200).send();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
		req: IAuthenticatedRequest,
		res: Response,
		next: NextFunction
	): void => {
		logger.error(err.stack);
		res.status(401).send("Unauthenticated!");
		next();
	}
);

export default beamRouter;
