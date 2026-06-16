import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DeliveryStatus } from '@prisma/client';

export class UpdateDeliveryStatusDto {
	@ApiProperty({
		enum: DeliveryStatus,
		description: 'Novo estado da entrega',
	})
	@IsEnum(DeliveryStatus)
	deliveryStatus!: DeliveryStatus;
}
