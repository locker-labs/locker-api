import { decrypt, encrypt } from "../../../src/infrastructure/utils/encryption";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config: any = {
	encriptionAlgorithm: "aes-256-cbc",
	encriptionKey: "tMGGvZr7NPR/x0yZ8TBVRexghJWEL0nslubAnBrlZ/k=",
};
describe("encryption", () => {
	it("encrypt", async () => {
		const text = "test";
		const { iv, encryptedText } = encrypt(text, config);
		expect(iv).toBeDefined();
		expect(encryptedText).toBeDefined();
		expect(encryptedText).not.toEqual(text);
	});

	it("decrypt", async () => {
		const text = "test-ABCfra";
		const { iv, encryptedText } = encrypt(text, config);
		const decrypted = decrypt(encryptedText, iv, config);
		expect(decrypted).toEqual(text);
	});
});
