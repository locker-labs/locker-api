import { IWebhook } from "@moralisweb3/streams-typings";

import { ILockerTokenBalance } from "../../schemas/lockers";
import { TokenTxInDb } from "../../schemas/tokenTxs";

const zeroAddress = "0x0000000000000000000000000000000000000000";

type Headers = { [key: string]: string | string[] | undefined };

interface IIndexerClient {
	watchOnChain(address: `0x${string}`): Promise<void>;
	verifyWebhook(body: IWebhook, headers: Headers): Promise<void>;
	// Given a list of transactions, return all token balances for each chain-contract combination.
	getLockerTokenBalances({
		lockerAddress,
		txs,
	}: {
		lockerAddress: `0x${string}`;
		txs: TokenTxInDb[];
	}): Promise<ILockerTokenBalance[]>;
}

export { type Headers, type IIndexerClient, zeroAddress };
