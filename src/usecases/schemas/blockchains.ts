/* eslint-disable no-shadow */
// All chains can be listed here even if not fully or partially supported by Locker.
enum ChainIds {
	ARBITRUM = 42161,
	AVALANCHE = 43114,
	BASE = 8453,
	OPTIMISM = 10,
	POLYGON = 137,
	ETHEREUM = 1,
	LINEA = 59144,

	ARBITRUM_SEPOLIA = 421614,
	// not supported on moralis
	AVALANCHE_FUJI = 43113,
	BASE_SEPOLIA = 84532,
	OPTIMISM_SEPOLIA = 11155420,
	SEPOLIA = 11155111,
	// not supported on moralis
	POLYGON_MUMBAI = 80001,
}

export default ChainIds;
