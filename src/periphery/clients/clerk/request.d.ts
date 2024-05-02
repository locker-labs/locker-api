// import { StrictAuthProp } from "@clerk/clerk-sdk-node";

// declare module "express-serve-static-core" {
// 	interface Request extends StrictAuthProp {}
// }

import { StrictAuthProp } from "@clerk/clerk-sdk-node";

declare global {
	/* eslint-disable @typescript-eslint/no-namespace */
	namespace Express {
		// eslint-disable-next-line no-shadow
		interface Request extends StrictAuthProp {}
	}
}
