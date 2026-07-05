import { IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class NearestDriversDto {
	@Type(() => Number)
	@IsNumber()
	lat!: number;

	@Type(() => Number)
	@IsNumber()
	lng!: number;

	@IsOptional()
	@IsString()
	vehicleType?: string;

	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(1)
	@Max(100)
	radiusKm?: number;

	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(1)
	@Max(50)
	limit?: number;
}
