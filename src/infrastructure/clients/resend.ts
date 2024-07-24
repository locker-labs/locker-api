import { Resend } from "resend";
import winston from "winston";

import config from "../../config";
import SUPPORTED_CHAINS from "../../dependencies/chains";
import { logger } from "../../dependencies/logger";
import IEmailClient from "../../usecases/interfaces/clients/email";
import ChainIds from "../../usecases/schemas/blockchains";
import { TokenTx } from "../../usecases/schemas/tokenTxs";

export default class ResendClient implements IEmailClient {
	resend: Resend;

	logger: winston.Logger;

	constructor() {
		this.resend = new Resend(config.resendApiKey);
		this.logger = logger;
	}

	async send(
		email: string,
		tx: TokenTx,
		isConfirmed: boolean
	): Promise<void> {
		const scale = BigInt(100000); // 10^5 for five decimal places
		const scaledResult =
			(BigInt(tx.amount) * scale) /
			BigInt(10) ** BigInt(tx.tokenDecimals);
		const finalAmount = Number(scaledResult) / 100000;
		const amountStr = `${finalAmount.toFixed(5)} ${tx.tokenSymbol}`;
		const to = email;
		const chainId = tx.chainId as ChainIds;
		const link = `${config.lockerBaseUrl}/tx/${chainId}/${tx.txHash}`;
		const explorer = SUPPORTED_CHAINS[chainId].blockExplorer;
		const chainName = SUPPORTED_CHAINS[chainId].name;
		const emailHTML = this.getHtml(
			explorer,
			tx.toAddress,
			amountStr,
			chainName,
			link,
			isConfirmed
		);

		await this.resend.emails.send({
			from: "Locker <contact@noreply.locker.money>",
			to,
			subject: `Received ${amountStr} in Locker`,
			html: emailHTML,
		});

		this.logger.info(`Email sent to ${to} for tx ${tx.txHash}.`);
	}

	getHtml(
		explorer: string,
		lockerAddress: string,
		amountStr: string,
		chainName: string,
		link: string,
		isConfirmed: boolean
	): string {
		const transactionStatus = isConfirmed
			? `The transaction has been confirmed.`
			: `The transaction is pending. We'll let you know when it's confirmed.`;

		const title = isConfirmed ? "Payment confirmed" : "Payment pending";

		return `<div
			style="
				font-family: Arial, sans-serif;
				color: #3a3a3f;
				text-align: start;
				padding: 20px;
			"
		>
			<div
				style="
					max-width: 600px;
					margin: auto;
					background-color: #ffffff;
					padding: 20px;
					border-radius: 8px;
					box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
				"
			>
				<img
					src="https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvdXBsb2FkZWQvaW1nXzJmckJ2ZXY5cHVLQ1VGTXFuODJTRGgyRE5XayJ9?width=400"
					alt="Locker Logo Icon"
					style="width: 100px; height: auto; margin-bottom: 20px"
				/>
				<h2 style="color: #4c4edd">${title}</h2>
				<p>
					Your locker with address
					<a
						href="${explorer}/address/${lockerAddress}"
						style="color: #4c4edd"
						>${lockerAddress}</a
					>
					just received ${amountStr} on the ${chainName} network. ${transactionStatus}
				</p>
				<a
					href="${link}"
					style="
						color: #ffffff;
						text-decoration: none;
						font-weight: bold;
						display: inline-block;
						margin-top: 20px;
						padding: 10px 15px;
						background-color: #4c4edd;
						border-radius: 4px;
						box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
					"
					>View details</a
				>
				<hr
					style="
						border-color: #e5e5e5;
						border-style: solid;
						border-width: 1px 0 0;
					"
				/>
				<p style="font-size: small; color: #666">
					You received this email because you are registered with
					Locker. If you believe this was an error, please
					<a href="mailto:support@chainrule.io" style="color: #4c4edd"
						>contact us</a
					>.
				</p>
			</div>
		</div>`;
	}
}
