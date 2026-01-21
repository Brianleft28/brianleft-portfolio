import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities/user.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private configService: ConfigService,
  ) {}

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async updateRefreshToken(userId: number, refreshToken: string | null): Promise<void> {
    const hashedRefreshToken = refreshToken ? await bcrypt.hash(refreshToken, 10) : null;

    await this.usersRepository.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  async createAdminIfNotExists(): Promise<void> {
    const adminUsername = this.configService.get('ADMIN_USERNAME');
    const adminPassword = this.configService.get('ADMIN_PASSWORD');

    if (!adminUsername || !adminPassword) {
      this.logger.warn('ADMIN_USERNAME o ADMIN_PASSWORD no configurados');
      return;
    }

    const existingAdmin = await this.findByUsername(adminUsername);
    if (existingAdmin) {
      this.logger.log(`Usuario admin "${adminUsername}" ya existe`);
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = this.usersRepository.create({
      username: adminUsername,
      password: hashedPassword,
      role: UserRole.ADMIN,
    });

    await this.usersRepository.save(admin);
    this.logger.log(`Usuario admin "${adminUsername}" creado correctamente`);
  }
}
