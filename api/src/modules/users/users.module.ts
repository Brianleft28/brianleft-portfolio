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
    // El dueño lo crea `npm run seed` (bootstrap-owner.seeder.ts), que además
    // inicializa filesystem, settings, personalidades y memorias. Este atajo de
    // arranque queda sólo como escape hatch si hiciera falta un admin sin seeder.
    const createAdmin = this.configService.get('CREATE_ADMIN_ON_STARTUP') === 'true';

    if (createAdmin) {
      await this.usersService.createAdminIfNotExists();
    } else {
      this.logger.log('Usuario dueño gestionado por el seeder (npm run seed).');
    }
  }
}
