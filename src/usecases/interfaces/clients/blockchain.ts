interface IBlockchainClient {
	sendTransaction(): Promise<void>;
}

export default IBlockchainClient;
