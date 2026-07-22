import { IsString, IsNotEmpty } from 'class-validator';

export class TestMessageDto {
	@IsString()
	@IsNotEmpty()
	phoneNumber: string;
}
