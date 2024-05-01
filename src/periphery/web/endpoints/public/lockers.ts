import express, { Request, Response } from "express";
import morgan from "morgan";

import { stream } from "../../../../dependencies";

const lockerRouter = express.Router();
lockerRouter.use(express.json());
lockerRouter.use(morgan("combined", { stream }));

lockerRouter.get("/", (req: Request, res: Response) => {
	res.status(200).send({ message: "Hello World." });
});

export default lockerRouter;
