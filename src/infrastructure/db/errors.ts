export default class DuplicateRecordError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "DuplicateRecordError";
	}
}
