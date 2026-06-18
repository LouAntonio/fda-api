import {
	IsOptional,
	IsString,
	IsInt,
	Min,
	Max,
	IsEnum,
	IsBoolean,
	IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole, UserStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListUsersDto {
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

	@ApiPropertyOptional({ description: 'Pesquisa por texto (nome, email)' })
	@IsOptional()
	@IsString()
	search?: string;

	@ApiPropertyOptional({
		enum: UserStatus,
		description: 'Filtrar por estado',
	})
	@IsOptional()
	@IsEnum(UserStatus)
	status?: UserStatus;

	@ApiPropertyOptional({ enum: UserRole, description: 'Filtrar por cargo' })
	@IsOptional()
	@IsEnum(UserRole)
	role?: UserRole;

	@ApiPropertyOptional({ description: 'Filtrar por telefone' })
	@IsOptional()
	@IsString()
	phoneNumber?: string;

	@ApiPropertyOptional({ description: 'Filtrar por apelido' })
	@IsOptional()
	@IsString()
	surname?: string;

	@ApiPropertyOptional({ description: 'Filtrar por email verificado' })
	@IsOptional()
	@Type(() => Boolean)
	@IsBoolean()
	emailVerified?: boolean;

	@ApiPropertyOptional({ description: 'Filtrar por telefone verificado' })
	@IsOptional()
	@Type(() => Boolean)
	@IsBoolean()
	phoneNumberVerified?: boolean;

	@ApiPropertyOptional({ description: 'Data início (ISO 8601)' })
	@IsOptional()
	@IsDateString()
	dateFrom?: string;

	@ApiPropertyOptional({ description: 'Data fim (ISO 8601)' })
	@IsOptional()
	@IsDateString()
	dateTo?: string;

	@ApiPropertyOptional({
		description: 'Incluir utilizadores deletados (soft delete)',
	})
	@IsOptional()
	@Type(() => Boolean)
	@IsBoolean()
	includeDeleted?: boolean;

	@ApiPropertyOptional({
		enum: ['createdAt', 'name', 'role', 'status'],
		description: 'Campo para ordenar',
	})
	@IsOptional()
	@IsString()
	sortBy?: 'createdAt' | 'name' | 'role' | 'status';

	@ApiPropertyOptional({
		enum: ['asc', 'desc'],
		description: 'Direção da ordenação',
	})
	@IsOptional()
	@IsString()
	sortOrder?: 'asc' | 'desc';
}
