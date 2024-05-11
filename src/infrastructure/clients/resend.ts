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

	async send(email: string, tx: TokenTx): Promise<void> {
		const amountStr = `${tx.amount} ${tx.tokenSymbol}`;
		const link = `${config.lockerBaseUrl}/tx/${tx.txHash}`;
		const to = email;
		const chainId = tx.chainId as ChainIds;
		const explorer = SUPPORTED_CHAINS[chainId].blockExplorer;
		const chainName = SUPPORTED_CHAINS[chainId].name;
		const emailHTML = this.getHtml(
			explorer,
			to,
			amountStr,
			chainName,
			link
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
		toEmail: string,
		amountStr: string,
		chainName: string,
		link: string
	): string {
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
			<h2 style="color: #4c4edd">Payment received</h2>
			<p>
				Your locker with address
				<a
					href="${explorer}/address/${toEmail}"
					style="color: #4c4edd"
					>${toEmail}</a
				>
				just received ${amountStr} on the ${chainName} network.
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
				>Go to your Locker dashboard</a
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
