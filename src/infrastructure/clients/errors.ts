export default class InvalidSignature extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InvalidSignature";
	}
}
