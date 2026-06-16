import { IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoleDto {
	@ApiProperty({ enum: UserRole, description: 'Novo cargo do utilizador' })
	@IsEnum(UserRole)
	role!: UserRole;
}
