import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';
import { ResendModule } from '../email/resend.module';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
	imports: [AuthModule, ResendModule],
	controllers: [UsersController],
	providers: [UsersService, RolesGuard],
	exports: [UsersService],
})
export class UsersModule {}
