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
import { zeroAddress } from "viem";

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
	console.log("Updating automation status for policies: ", policies);
	// eslint-disable-next-line no-restricted-syntax
	for (const policy of policies) {
		const { automations } = policy;
		// eslint-disable-next-line no-restricted-syntax
		for (const automation of policy.automations) {
			if (automation.type === EAutomationType.OFF_RAMP) {
				automation.status = EAutomationStatus.AUTOMATE_THEN_READY;
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
	console.log("Got onboarding event: ", eventName);

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
	console.log(
		"Got onboarding event for offRampAccount: ",
		eventName,
		offRampAccount
	);

	if (offRampAccount) {
		console.log("Updating offramp account");
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
	console.log("handleAddressAddedEvent ", eventName);
	const tokenIdMap: {
		[key: string]: {
			tokenId: string;
			chainId: number;
			contractAddress: `0x${string}`;
		};
	} = {
		// arbitrum
		"User.BeamAddress.Added.USDC.ARBITRUM": {
			tokenId: "USDC.ARBITRUM",
			chainId: ChainIds.ARBITRUM,
			contractAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
		},
		"User.BeamAddress.Added.ETH.ARBITRUM": {
			tokenId: "ETH.ARBITRUM",
			chainId: ChainIds.ARBITRUM,
			contractAddress: zeroAddress,
		},

		// ethereum
		"User.BeamAddress.Added.USDC.ETH": {
			tokenId: "USDC.ETH",
			chainId: ChainIds.ETHEREUM,
			contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
		},
		"User.BeamAddress.Added.ETH": {
			tokenId: "ETH",
			chainId: ChainIds.ETHEREUM,
			contractAddress: zeroAddress,
		},

		// avalanche
		"User.BeamAddress.Added.USDC.AVAX": {
			tokenId: "USDC.AVAX",
			chainId: ChainIds.AVALANCHE,
			contractAddress: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
		},
		"User.BeamAddress.Added.AVAX": {
			tokenId: "AVAX",
			chainId: ChainIds.AVALANCHE,
			contractAddress: zeroAddress,
		},

		// polygon
		"User.BeamAddress.Added.USDC.POLYGON": {
			tokenId: "USDC.POLYGON",
			chainId: ChainIds.POLYGON,
			contractAddress: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
		},
		"User.BeamAddress.Added.MATIC.POLYGON": {
			tokenId: "MATIC.POLYGON",
			chainId: ChainIds.POLYGON,
			contractAddress: zeroAddress,
		},

		// base
		"User.BeamAddress.Added.USDC.BASE": {
			tokenId: "USDC.BASE",
			chainId: ChainIds.BASE,
			contractAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
		},
		"User.BeamAddress.Added.ETH.BASE": {
			tokenId: "ETH.BASE",
			chainId: ChainIds.BASE,
			contractAddress: zeroAddress,
		},
	};

	const tokenInfo = tokenIdMap[eventName];
	console.log("tokenInfo for ", eventName, tokenInfo);
	if (!tokenInfo) {
		return;
	}

	const offRampAccount = await offRampRepo.retrieve({
		beamAccountId: offRampAccountId,
	});
	console.log("For address added event: ", offRampAccount, offRampAccountId);

	if (offRampAccount) {
		const { contractAddress, tokenId } = tokenInfo;
		const address = getAddress(resp, tokenId);

		console.log(
			"Adding address: ",
			offRampAccount,
			tokenInfo,
			address,
			contractAddress
		);

		try {
			await offRampRepo.createOffRampAddress(
				offRampAccount!.id,
				tokenInfo.chainId,
				address!,
				contractAddress.toLowerCase()
			);
		} catch (error) {
			console.warn(
				"Something went wrong creating offramp address",
				error
			);
		}
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
				// throw new Error("Unsupported event");
				// {
				// 	id: 'ed6cc19a-6789-42ab-897a-dae278f1e184',
				// 	eventName: 'Beam.Trade.Initiated',
				// 	partnerId: 'df803fcb-34f0-413d-99ef-dc777e88e6a4',
				// 	createdAt: '2024-08-13T23:23:31.291Z',
				// 	resources: [
				// 	  'accounts/individuals/785ca7d9-170f-4801-829f-a1a59f81e999/trades/f75ff65a-4c0b-47ba-8a3f-bc65c678579c'
				// 	]
				//   }

				// {
				// 	id: 'e0a02001-ee87-447a-8914-9b66e4b5c74b',
				// 	eventName: 'Beam.Trade.Completed',
				// 	partnerId: 'df803fcb-34f0-413d-99ef-dc777e88e6a4',
				// 	createdAt: '2024-08-13T23:24:03.409Z',
				// 	resources: [
				// 		'accounts/individuals/785ca7d9-170f-4801-829f-a1a59f81e999/trades/f75ff65a-4c0b-47ba-8a3f-bc65c678579c'
				// 	]
				// }
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
