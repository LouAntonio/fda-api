import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationPrefsDto {
	@ApiPropertyOptional({ description: 'Notificações push ativadas' })
	@IsOptional()
	@IsBoolean()
	pushEnabled?: boolean;

	@ApiPropertyOptional({ description: 'Notificações por email ativadas' })
	@IsOptional()
	@IsBoolean()
	emailEnabled?: boolean;

	@ApiPropertyOptional({ description: 'Sons ativados' })
	@IsOptional()
	@IsBoolean()
	soundsEnabled?: boolean;
}
