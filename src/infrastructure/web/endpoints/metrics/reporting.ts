import express, { Request, Response } from "express";
import morgan from "morgan";

import { getIndexerClient, stream } from "../../../../dependencies";
import supabase from "../../../../lib/supabase";
import { LockerInDb } from "../../../../usecases/schemas/lockers";
// import { TokenTxInDb } from "../../../../usecases/schemas/tokenTxs";

const reportingRouter = express.Router();
reportingRouter.use(express.json());
reportingRouter.use(morgan("combined", { stream }));

/**
 * These endpoints are used to report metrics to Retool.
 * The fields modified (currently only usd_value) are not intended to be used for application purposes.
 * Polling is currently periodic and not guaranteed to be useful in real-time application scenarios.
 */

const setLockerUsdValue = async (locker: LockerInDb): Promise<void> => {
	const indexer = await getIndexerClient();
	try {
		const usdValue = await indexer.getLockerUsdValue({
			lockerAddress: locker.address,
		});
		// console.log("setting", usdValue);
		await supabase
			.from("lockers")
			.update({
				usd_value: usdValue,
				updated_at: new Date().toISOString(),
			})
			.eq("id", locker.id);
	} catch (error) {
		// Do nothing
	}
};

// const setTxUsdValue = async (tx: TokenTxInDb): Promise<void> => {
// 	const indexer = await getIndexerClient();
// 	try {
// 		const usdValue = await indexer.getLockerUsdValue({
// 			lockerAddress: locker.address,
// 		});
// 		console.log("setting", usdValue);
// 		const { data, error } = await supabase
// 			.from("lockers")
// 			.update({ usd_value: usdValue })
// 			.eq("id", tx.id);

// 		console.log("updated locker", locker.id);
// 		console.log(error);
// 		console.log(data);
// 	} catch (error) {
// 		// Do nothing
// 	}
// };
const updateLockerValues = async (): Promise<number> => {
	const now = new Date();
	const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

	const { data, error } = await supabase
		.from("lockers")
		.select("*")
		.lte("updated_at", oneDayAgo.toISOString())
		.limit(10);

	if (error) return 0;

	const lockers = data as LockerInDb[];
	const lockerUpdates = lockers.map(setLockerUsdValue);
	await Promise.all(lockerUpdates);
	return lockers.length;
};

// const updateTxValues = async (): Promise<number> => {
// 	const { data, error } = await supabase
// 		.from("transactions")
// 		.select("*")
// 		.is("usd_value", null)
// 		.limit(10);

// 	console.log(data);
// 	console.log(error);

// 	if (!data) return 0;

// 	const txs = data as TokenTxInDb[];
// 	// const txUpdates = txs.map(setTxUsdValue);
// 	// await Promise.all(txUpdates);
// 	return txs.length;
// };

/*
    Get usd_value for all lockers and transactions
*/
reportingRouter.get("/", async (req: Request, res: Response): Promise<void> => {
	const currentDateTime = new Date().toISOString();

	const numLockers = await updateLockerValues();
	// const numTxs = await updateTxValues();
	// get all lockers without usd_value set, call moralis, set it
	// get all transactions without usd_value set, call moralist, set it
	res.status(200).send({
		numLockers,
		numTxs: 0,
		datetime: currentDateTime,
	});
});

export default reportingRouter;
