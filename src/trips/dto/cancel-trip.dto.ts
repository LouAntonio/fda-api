import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelTripDto {
	@ApiProperty({
		example: 'Motorista demorou muito',
		description: 'Motivo do cancelamento',
	})
	@IsString()
	@IsNotEmpty({ message: 'Motivo de cancelamento é obrigatório' })
	cancelReason!: string;
}
