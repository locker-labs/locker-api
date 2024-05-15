// import viem or whatever

import config from "../../config"; // this is for environment variables
import IBlockchainClient from "../../usecases/interfaces/clients/blockchain";

class EvmClient implements IBlockchainClient {
	// remove constructor if it's not need; leaving for now
	constructor() {}

	async sendTransaction(): Promise<void> {
		// do the thing;
	}
}

export default EvmClient;
