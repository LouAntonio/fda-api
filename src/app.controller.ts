import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
	constructor(private readonly appService: AppService) {}

	@ApiOperation({
		summary: 'Health check',
		description: 'Verifica se a API está operacional',
	})
	@Get()
	getHello(): string {
		return this.appService.getHello();
	}
}
