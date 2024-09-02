interface IOffRampClient {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getAccount(accountId: string): Promise<any>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	createAccount(emailAddress: string, sourceAddress: string): Promise<any>;
}

export default IOffRampClient;
