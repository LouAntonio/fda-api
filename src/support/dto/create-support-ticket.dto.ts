import { IsString, IsOptional, MinLength, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupportTicketDto {
	@ApiProperty({ example: 'João Silva', description: 'Nome completo' })
	@IsString()
	@MinLength(1)
	name!: string;

	@ApiPropertyOptional({ example: 'joao@email.com', description: 'E-mail' })
	@IsString()
	@IsOptional()
	@IsEmail()
	email?: string;

	@ApiPropertyOptional({
		example: '+244 923 456 789',
		description: 'Telefone',
	})
	@IsString()
	@IsOptional()
	phone?: string;

	@ApiProperty({
		example: 'Tive um problema com a minha última viagem...',
		description: 'Mensagem',
	})
	@IsString()
	@MinLength(1)
	message!: string;
}
