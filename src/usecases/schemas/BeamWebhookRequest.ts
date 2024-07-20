import { IsArray, IsDateString, IsString } from "class-validator";

class BeamWebhookRequest {
	@IsString()
	id!: string;

	@IsString()
	eventName!: string;

	@IsDateString()
	createdAt!: string;

	@IsArray()
	@IsString({ each: true })
	resources!: string[];
}

export default BeamWebhookRequest;
