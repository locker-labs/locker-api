import { NextFunction, Request, Response } from "express";

// Middleware to check for 'api-key' header
const checkApiKey = (req: Request, res: Response, next: NextFunction) => {
	// reading the headers
	const token = req.headers["api-key"];
	if (token !== process.env.LOCKER_API_KEY) {
		res.status(200).send({ message: "ok" });
	}
	next();
};
export default checkApiKey;
