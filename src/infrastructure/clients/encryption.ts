import crypto from "crypto";

import config from "../../config";

export function encrypt(text: string): { iv: string; encryptedText: string } {
	const iv = crypto.randomBytes(16); // Initialization vector
	const cipher = crypto.createCipheriv(
		config.encriptionAlgorithm,
		Buffer.from(config.encriptionKey, "base64"),
		iv
	);
	let encrypted = cipher.update(text, "utf8", "hex");
	encrypted += cipher.final("hex");
	return {
		iv: iv.toString("base64"), // Return the IV as a base64 encoded string
		encryptedText: encrypted,
	};
}

export function decrypt(encryptedText: string, iv: string): string {
	const decipher = crypto.createDecipheriv(
		config.encriptionAlgorithm,
		Buffer.from(config.encriptionKey, "base64"),
		Buffer.from(iv, "base64")
	);
	let decrypted = decipher.update(encryptedText, "hex", "utf8");
	decrypted += decipher.final("utf8");
	return decrypted;
}
