import {
	IsOptional,
	IsString,
	IsInt,
	Min,
	Max,
	IsEnum,
	IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
	TripStatus,
	ServiceType,
	PaymentStatus,
	DeliveryStatus,
} from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListTripsDto {
	@ApiPropertyOptional({ example: 1, description: 'Número da página' })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number;

	@ApiPropertyOptional({
		example: 20,
		description: 'Limite de resultados por página',
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(500)
	limit?: number;

	@ApiPropertyOptional({
		enum: TripStatus,
		description: 'Filtrar por estado',
	})
	@IsOptional()
	@IsEnum(TripStatus)
	status?: TripStatus;

	@ApiPropertyOptional({
		enum: ServiceType,
		description: 'Filtrar por tipo de serviço',
	})
	@IsOptional()
	@IsEnum(ServiceType)
	serviceType?: ServiceType;

	@ApiPropertyOptional({
		enum: PaymentStatus,
		description: 'Filtrar por estado de pagamento',
	})
	@IsOptional()
	@IsEnum(PaymentStatus)
	paymentStatus?: PaymentStatus;

	@ApiPropertyOptional({
		enum: DeliveryStatus,
		description: 'Filtrar por estado de entrega',
	})
	@IsOptional()
	@IsEnum(DeliveryStatus)
	deliveryStatus?: DeliveryStatus;

	@ApiPropertyOptional({ description: 'Filtrar por cliente (ID)' })
	@IsOptional()
	@IsString()
	clientId?: string;

	@ApiPropertyOptional({ description: 'Filtrar por motorista (ID)' })
	@IsOptional()
	@IsString()
	driverId?: string;

	@ApiPropertyOptional({
		description: 'Data início (criação) - ISO 8601',
	})
	@IsOptional()
	@IsDateString()
	dateFrom?: string;

	@ApiPropertyOptional({
		description: 'Data fim (criação) - ISO 8601',
	})
	@IsOptional()
	@IsDateString()
	dateTo?: string;

	@ApiPropertyOptional({
		description: 'Pesquisa por endereço de recolha ou destino',
	})
	@IsOptional()
	@IsString()
	search?: string;

	@ApiPropertyOptional({
		description: 'Incluir viagens deletadas (soft delete)',
	})
	@IsOptional()
	@Type(() => Boolean)
	includeDeleted?: boolean;

	@ApiPropertyOptional({
		enum: ['createdAt', 'requestedAt', 'totalPrice', 'status'],
		description: 'Campo para ordenar',
	})
	@IsOptional()
	@IsString()
	sortBy?: 'createdAt' | 'requestedAt' | 'totalPrice' | 'status';

	@ApiPropertyOptional({
		enum: ['asc', 'desc'],
		description: 'Direção da ordenação',
	})
	@IsOptional()
	@IsString()
	sortOrder?: 'asc' | 'desc';
}
