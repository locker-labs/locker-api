import "dotenv/config";

// import { plainToClass } from "class-transformer";
// import { validate } from "class-validator";
import express, {
	// NextFunction,
	Request,
	// RequestHandler,
	Response,
} from "express";
import morgan from "morgan";

import {
	getIndexerClient,
	// getLockersRepo,
	stream,
} from "../../../../dependencies";
// import { CreateLockerRequest } from "../../../../usecases/schemas/lockers";
import InvalidSignature from "../../../clients/errors";

const moralisRouter = express.Router();
moralisRouter.use(express.json());
moralisRouter.use(morgan("combined", { stream }));

moralisRouter.post(
	"/webhooks/transactions",
	async (req: Request, res: Response): Promise<void> => {
		const providedSignature = req.headers["x-signature"];
		if (!providedSignature)
			res.status(400).send({ error: "Signature not provided." });

		const indexer = await getIndexerClient();

		try {
			await indexer.verifyWebhook(providedSignature as string, req.body);
		} catch (error) {
			if (error instanceof InvalidSignature) {
				res.status(400).send({ error: error.message });
			}
		}

		res.status(200).send();
	}
);

export default moralisRouter;
