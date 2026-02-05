import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../../entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User]), ConfigModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule implements OnModuleInit {
  private readonly logger = new Logger(UsersModule.name);

  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    // En modo white-label, NO crear admin automáticamente
    // El admin se crea solo si CREATE_ADMIN_ON_STARTUP=true en el .env
    const createAdmin = this.configService.get('CREATE_ADMIN_ON_STARTUP') === 'true';
    
    if (createAdmin) {
      await this.usersService.createAdminIfNotExists();
    } else {
      this.logger.log('Modo white-label: Los usuarios se crean via /auth/register');
    }
  }
}
