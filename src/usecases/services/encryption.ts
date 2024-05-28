import crypto from "crypto";

import config, { Config } from "../../config";

export function encrypt(
	text: string,
	configuration: Config = config
): { iv: string; encryptedText: string } {
	const iv = crypto.randomBytes(16); // Initialization vector
	const cipher = crypto.createCipheriv(
		configuration.encriptionAlgorithm,
		Buffer.from(configuration.encriptionKey, "base64"),
		iv
	);
	let encrypted = cipher.update(text, "utf8", "hex");
	encrypted += cipher.final("hex");
	return {
		iv: iv.toString("base64"), // Return the IV as a base64 encoded string
		encryptedText: encrypted,
	};
}

export function decrypt(
	encryptedText: string,
	iv: string,
	configuration: Config = config
): string {
	const decipher = crypto.createDecipheriv(
		configuration.encriptionAlgorithm,
		Buffer.from(configuration.encriptionKey, "base64"),
		Buffer.from(iv, "base64")
	);
	let decrypted = decipher.update(encryptedText, "hex", "utf8");
	decrypted += decipher.final("utf8");
	return decrypted;
}
