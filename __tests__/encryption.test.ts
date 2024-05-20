import { decrypt, encrypt } from "../src/infrastructure/clients/encryption";

describe("encryption", () => {
	it("encrypt", async () => {
		const text = "test";
		const { iv, encryptedText } = encrypt(text);
		expect(iv).toBeDefined();
		expect(encryptedText).toBeDefined();
		expect(encryptedText).not.toEqual(text);
	});

	it("decrypt", async () => {
		const text = "test-ABCfra";
		const { iv, encryptedText } = encrypt(text);
		const decrypted = decrypt(encryptedText, iv);
		expect(decrypted).toEqual(text);
	});
});
