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
	getPoliciesRepo,
	logger,
	stream,
} from "../../../../dependencies";
import { getExecutorClient } from "../../../../dependencies/clients";
import CreatePolicyRequest from "../../../../usecases/schemas/CreatePolicyRequest";
import {
	PolicyRepoAdapter,
	UpdatePoliciesRepoAdapter,
} from "../../../../usecases/schemas/policies";
import UpdatePolicyRequest from "../../../../usecases/schemas/UpdatePolicyRequest";
import { encrypt } from "../../../../usecases/services/encryption";
import DuplicateRecordError from "../../../db/errors";

const policyRouter = express.Router();
policyRouter.use(express.json());
policyRouter.use(morgan("combined", { stream }));

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

policyRouter.post(
	"/create",
	authRequired,
	validateRequest(CreatePolicyRequest),
	async (
		req: AuthenticatedRequest<Request>,
		res: Response
	): Promise<void> => {
		// Ensure that Locker exists
		const lockersRepo = await getLockersRepo();
		const { lockerId, chainId, sessionKey, automations } = req.body;
		const locker = await lockersRepo.retrieve({
			id: req.body.lockerId,
		});

		if (!locker) {
			res.status(404).send({ error: "Locker not found." });
			return;
		}

		// encrypt the session key
		const { iv, encryptedText } = encrypt(sessionKey);

		// store locker in database
		const policy: PolicyRepoAdapter = {
			lockerId,
			chainId,
			encryptedSessionKey: encryptedText,
			encodedIv: iv,
			automations,
		};

		const policiesRepo = await getPoliciesRepo();
		try {
			// Persist policy to DB
			const createdPolicy = await policiesRepo.create(policy);

			// Tell Zerodev paymaster that Locker will pay gas for transactions from this locker
			const executor = getExecutorClient();
			await executor.enablePaymaster({
				addressToSponsor: locker.address,
				chainId,
			});

			res.status(201).send({
				data: { policy: createdPolicy },
			});
		} catch (error) {
			if (error instanceof DuplicateRecordError) {
				res.status(409).send({ error: error.message });
				return;
			}
			res.status(500).send({ error: "An unexpected error occurred." });
		}
	}
);

policyRouter.patch(
	"/:policyId",
	authRequired,
	validateRequest(UpdatePolicyRequest),
	async (
		req: AuthenticatedRequest<Request>,
		res: Response
	): Promise<void> => {
		// ensure that supplied policy exists
		const policiesRepo = await getPoliciesRepo();
		const policy = await policiesRepo.retrieve(
			{ id: parseInt(req.params.policyId, 10) },
			false
		);
		if (!policy) {
			res.status(404).send({ error: "Policy not found." });
			return;
		}

		// encrypt the session key if sessionKey is provided
		let policyUpdate: UpdatePoliciesRepoAdapter = {};
		if (req.body.sessionKey) {
			const { iv, encryptedText } = encrypt(req.body.sessionKey);
			policyUpdate = {
				encryptedSessionKey: encryptedText,
				encodedIv: iv,
			};
		}
		policyUpdate.automations = req.body.automations;

		// update policy
		let updatedPolicy;
		try {
			updatedPolicy = await policiesRepo.update(
				{
					id: parseInt(req.params.policyId, 10),
				},
				policyUpdate
			);
			res.status(200).send({ data: { policy: updatedPolicy } });
		} catch (error) {
			if (error instanceof DuplicateRecordError) {
				res.status(409).send({ error: error.message });
				return;
			}
			res.status(500).send({ error: "An unexpected error occurred." });
		}
	}
);

policyRouter.get(
	"/:lockerId",
	authRequired,
	async (
		req: AuthenticatedRequest<Request>,
		res: Response
	): Promise<void> => {
		const policiesRepo = await getPoliciesRepo();
		const policies = await policiesRepo.retrieveMany(
			parseInt(req.params.lockerId, 10)
		);
		res.status(200).json({ data: { policies } });
	}
);

// note: needs to be below routes
policyRouter.use(
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

export default policyRouter;
