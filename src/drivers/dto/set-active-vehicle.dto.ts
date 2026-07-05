import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetActiveVehicleDto {
	@ApiProperty({
		example: 'uuid-do-veiculo',
		description: 'ID do veículo a definir como ativo',
	})
	@IsString()
	@IsUUID()
	vehicleId!: string;
}
