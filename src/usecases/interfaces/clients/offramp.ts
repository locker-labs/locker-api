interface IOffRampClient {
	getAccount(accountId: string): Promise<any>;
	createAccount(emailAddress: string, sourceAddress: string): Promise<any>;
}

export default IOffRampClient;
