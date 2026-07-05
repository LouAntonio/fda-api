import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestPayoutDto {
	@ApiProperty({
		example: 25000,
		description: 'Valor do saque (Kz) — apenas dinheiro vivo',
	})
	@IsNumber()
	@Min(1)
	amount!: number;
}
