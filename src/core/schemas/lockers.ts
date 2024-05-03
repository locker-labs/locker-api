import { IsString, Length } from "class-validator";

export default class CreateLockerRequest {
	@IsString()
	@Length(42, 42) // addresses are exactly 42 characters
	signer!: string;

	@IsString()
	@Length(10, 10)
	seed!: string;
}
