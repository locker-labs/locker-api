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

import CreateLockerRequest from "../../../../core/schemas/lockers";
import {
	AuthenticatedRequest,
	authRequired,
	logger,
	stream,
} from "../../../../dependencies";

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
	(req: AuthenticatedRequest<Request>, res: Response): void => {
		// console.log("user:", req.auth.userId, "\n\n");
		// console.log("body:", req.body);
		res.status(200).send({ message: "Hello World." });
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
