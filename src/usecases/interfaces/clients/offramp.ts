interface IOffRampClient {
	getAccount(accountId: string): Promise<any>;
}

export default IOffRampClient;
