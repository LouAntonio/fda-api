import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
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
	@Max(100)
	limit?: number;

	@ApiPropertyOptional({ description: 'Pesquisa por texto' })
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
}
