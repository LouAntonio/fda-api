import { IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UserQueryDto {
	@ApiPropertyOptional({ description: 'Incluir endereços' })
	@IsOptional()
	@Type(() => Boolean)
	@IsBoolean()
	includeAddresses?: boolean;

	@ApiPropertyOptional({ description: 'Incluir sessões' })
	@IsOptional()
	@Type(() => Boolean)
	@IsBoolean()
	includeSessions?: boolean;

	@ApiPropertyOptional({ description: 'Incluir contas (providers)' })
	@IsOptional()
	@Type(() => Boolean)
	@IsBoolean()
	includeAccounts?: boolean;

	@ApiPropertyOptional({ description: 'Incluir push tokens' })
	@IsOptional()
	@Type(() => Boolean)
	@IsBoolean()
	includePushTokens?: boolean;
}
