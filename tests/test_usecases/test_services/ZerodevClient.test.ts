import ZerodevClient from "../../../src/infrastructure/clients/zerodev";
import ChainIds from "../../../src/usecases/schemas/blockchains";

describe.skip("ZerodevClient", () => {
	// Used to manually test that policy is added
	it("enablePaymaster", async () => {
		const zerodevClient = new ZerodevClient();
		const chainId = ChainIds.SEPOLIA;
		const addressToSponsor = "0xF445b07Aad98De9cc2794593B68ecD4aa5f81076";
		await zerodevClient.enablePaymaster({ chainId, addressToSponsor });
		expect(true).toBe(true);
	});
});
