import express, { Request, Response } from "express";
import morgan from "morgan";

import { stream } from "../../../../dependencies";

const healthRouter = express.Router();
healthRouter.use(express.json());
healthRouter.use(morgan("combined", { stream }));

healthRouter.get("/", (req: Request, res: Response): void => {
	const currentDateTime = new Date().toISOString();
	res.status(200).send({ status: "healthy", datetime: currentDateTime });
});

export default healthRouter;
