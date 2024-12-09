import "dotenv/config";

import { CallType } from "@zerodev/sdk/types";
import Big from "big.js";
import express, { Request, Response } from "express";
import morgan from "morgan";
import { encodeFunctionData, zeroAddress } from "viem";

import {
	AuthenticatedRequest,
	ERC20_TRANSFER_ABI,
	getTokenTxsRepo,
	stream,
} from "../../../../dependencies";
import { genRanHex, isTestEnv } from "../../../../dependencies/environment";
import supabase from "../../../../lib/supabase";
import { IBatchedTokenTx } from "../../../../usecases/interfaces/types";
import { EAutomationBatchType } from "../../../../usecases/schemas/policies";
import {
	ETokenTxAutomationsState,
	ETokenTxLockerDirection,
	TokenTxRepoAdapter,
} from "../../../../usecases/schemas/tokenTxs";
import ZerodevClient from "../../../clients/zerodev";

const automationsRouter = express.Router();
automationsRouter.use(express.json());
automationsRouter.use(morgan("combined", { stream }));

interface IGroupedBatchedTokenTx extends IBatchedTokenTx {
	totalAmount: string;
	transactions: IBatchedTokenTx[];
}

type IGroupedBatchedTokenTxs = {
	[key: string]: IGroupedBatchedTokenTx;
};

async function markTxsAsBatched(
	txs: IBatchedTokenTx[],
	batchType: EAutomationBatchType
) {
	if (txs.length > 0) {
		// Extract all transaction IDs that need updating
		const transactionIdsToUpdate = [...new Set(txs.map((tx) => tx.txId))];

		console.log(
			"Updating batched_by for transaction IDs:",
			transactionIdsToUpdate,
			batchType
		);

		// const batchTypeJson = JSON.stringify([batchType]); // Convert batchType to JSON array format
		const batchTypeJson = [batchType]; // Convert batchType to JSON array format
		const { error } = await supabase.rpc("update_token_transactions", {
			batch_type_json: batchTypeJson,
			transaction_ids: transactionIdsToUpdate,
		});

		if (error) {
			console.error(
				"Error updating transactions' batched_by field:",
				error
			);
			throw new Error("Error updating transactions' batched_by field:");
		} else {
			console.log("Transactions updated successfully.");
		}
	} else {
		console.log("No transactions require updating.");
	}
}

automationsRouter.get(
	"/exec-scheduled/:batchType",
	async (
		req: AuthenticatedRequest<Request>,
		res: Response
	): Promise<void> => {
		const { batchType } = req.params;
		console.log("Executing scheduled {}...", batchType);
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { policyEncryptedSessionKey, policyEncodedIv, ...sanitizedBody } =
			req.body;
		console.log(JSON.stringify(sanitizedBody, null, 2));
		// console.log(JSON.stringify(req.body.record, null, 2));

		// only process erc20, not eth
		const { data, error } = await supabase.rpc(
			"get_batched_tx_automations"
		);
		console.log(data);
		if (error) {
			console.log("Error getting token transactions: ", error);
			res.status(500).send({
				message: "Error getting token transactions",
				error,
			});
			return;
		}

		const erc20Transfers: IBatchedTokenTx[] = (data as IBatchedTokenTx[])
			// only erc20 transfers
			.filter((tx) => tx.txContractAddress !== zeroAddress)
			// matching the corresponding batch type (daily, hourly, etc)
			.filter((tx) => tx.automationBatchType === batchType);

		// update all the transaction batched_by field
		await markTxsAsBatched(
			erc20Transfers,
			batchType as EAutomationBatchType
		);

		// Group by sender_address, destination_address, token
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const groupedTransfers: IGroupedBatchedTokenTxs = erc20Transfers.reduce(
			(acc, tx) => {
				const key = `${tx.automationRecipientAddress}-${tx.txChainId}-${tx.txContractAddress}`;
				const txDiff = Big(tx.txAmount.toString()).times(
					tx.automationAllocation
				);
				if (!acc[key]) {
					acc[key] = {
						...tx,
						totalAmount: txDiff.toFixed(0),
						transactions: [tx],
					};
				} else {
					acc[key].transactions.push(tx);
					acc[key].totalAmount = Big(acc[key].totalAmount)
						.plus(txDiff)
						.toFixed(0);
				}
				return acc;
			},
			{} as IGroupedBatchedTokenTxs
		);

		// console.log("Grouped transfers: ", groupedTransfers);
		const tokenTxsApi = await getTokenTxsRepo();

		// iterate through grouped transfers
		/* eslint-disable */
		for (const [, group] of Object.entries(groupedTransfers)) {
			const {
				automationRecipientAddress: toAddress,
				txContractAddress: contractAddress,
				txTokenSymbol: tokenSymbol,
				txLockerId: lockerId,
				lockerAddress: fromAddress,
				txTokenDecimals: tokenDecimals,
				txChainId: chainId,
			} = group;

			// send one transfer for each group
			if (!toAddress) continue;

			// construct web3 transaction, using session key
			const amountOutStr = group.totalAmount;

			const amountOut = BigInt(amountOutStr);

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const erc20UnencodedData: any = {
				abi: ERC20_TRANSFER_ABI,
				functionName: "transfer",
				args: [toAddress, amountOut],
			};
			console.log("erc20UnencodedData", erc20UnencodedData);

			const erc20Data = encodeFunctionData(erc20UnencodedData);

			const callDataArgs = {
				to: contractAddress,
				value: BigInt(0),
				data: erc20Data,
				callType: "call" as CallType,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} as any;

			// console.log("callDataArgs", callDataArgs);

			// submit on-chain
			const callDataExecutor = new ZerodevClient();
			let txHash = genRanHex(64) as `0x${string}`;
			const policy = {
				lockerId,
				chainId,
				encryptedSessionKey: group.policyEncryptedSessionKey,
				encodedIv: group.policyEncodedIv,
				automations: group.policyAutomations,
			};
			if (!isTestEnv()) {
				try {
					// console.log("Preparing userOp", callDataArgs);
					txHash = (await callDataExecutor.execCallDataWithPolicy({
						policy,
						callDataArgs,
						scope: `${batchType}-${contractAddress}-${toAddress}`,
					})) as `0x${string}`;
					console.log("Transaction sent", txHash);
				} catch (e) {
					console.error("Unable to send userOp", e);
					continue;
				}
			}

			// Persist to DB.
			// This TX will also be picked up by Moralis, but here we can record what triggered this automation.
			const triggeredTx: TokenTxRepoAdapter = {
				lockerId,
				txHash,
				contractAddress,
				tokenSymbol,
				fromAddress,
				toAddress,
				tokenDecimals,
				isConfirmed: false,
				amount: amountOutStr,
				chainId,
				lockerDirection: ETokenTxLockerDirection.OUT,
				automationsState: ETokenTxAutomationsState.STARTED,
				triggeredByTokenTxId: group.txId,
			};

			console.log("Triggered TX with batch", triggeredTx);

			// eslint-disable-next-line no-await-in-loop
			await tokenTxsApi.create(triggeredTx);
			const sleepFor = process.env.TX_SLEEP_FOR
				? parseInt(process.env.TX_SLEEP_FOR)
				: 2000;
			console.log(`Sleeping for ${sleepFor}ms`);
			// eslint-disable-next-line no-await-in-loop
			await new Promise((resolve) => {
				setTimeout(resolve, sleepFor);
			});
			// return spawnedTx;
			// return triggeredTx;
		}

		res.status(200).send({
			numInTxs: erc20Transfers.length,
			numOutTxs: Object.keys(groupedTransfers).length,
		});
	}
);

export default automationsRouter;
