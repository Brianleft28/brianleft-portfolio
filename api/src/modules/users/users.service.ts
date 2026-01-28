import { Injectable, Logger, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities/user.entity';
import * as crypto from 'crypto';

export interface CreateUserDto {
  username: string;
  email: string;
  password?: string; // Si no se proporciona, se genera automáticamente
  displayName?: string;
  subdomain?: string;
  role?: UserRole;
}

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

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findBySubdomain(subdomain: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { subdomain } });
  }

  async updateRefreshToken(userId: number, refreshToken: string | null): Promise<void> {
    const hashedRefreshToken = refreshToken ? await bcrypt.hash(refreshToken, 10) : null;

    await this.usersRepository.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  /**
   * Genera una contraseña segura aleatoria
   */
  generateSecurePassword(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    const length = 16;
    let password = '';
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      password += chars[randomBytes[i] % chars.length];
    }
    return password;
  }

  /**
   * Crea un nuevo usuario
   */
  async createUser(dto: CreateUserDto): Promise<{ user: User; plainPassword: string }> {
    // Validaciones
    if (!dto.username || dto.username.length < 3) {
      throw new BadRequestException('Username debe tener al menos 3 caracteres');
    }

    if (!dto.email || !dto.email.includes('@')) {
      throw new BadRequestException('Email inválido');
    }

    // Verificar si ya existe el username
    const existingUsername = await this.findByUsername(dto.username);
    if (existingUsername) {
      throw new ConflictException(`Username "${dto.username}" ya está en uso`);
    }

    // Verificar si ya existe el email
    const existingEmail = await this.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException(`Email "${dto.email}" ya está registrado`);
    }

    // Generar subdomain si no se proporciona
    const subdomain = dto.subdomain || dto.username.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Verificar subdomain
    const existingSubdomain = await this.findBySubdomain(subdomain);
    if (existingSubdomain) {
      throw new ConflictException(`Subdomain "${subdomain}" ya está en uso`);
    }

    // Generar contraseña si no se proporciona
    const plainPassword = dto.password || this.generateSecurePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const user = this.usersRepository.create({
      username: dto.username,
      email: dto.email,
      password: hashedPassword,
      displayName: dto.displayName || dto.username,
      subdomain,
      role: dto.role || UserRole.ADMIN, // Por defecto admin (cada uno administra su portfolio)
    });

    const savedUser = await this.usersRepository.save(user);
    this.logger.log(`Usuario "${dto.username}" creado con subdomain "${subdomain}"`);

    // No devolver la contraseña hasheada ni token
    const { password: _, refreshToken: __, ...userWithoutSensitive } = savedUser;

    return { user: userWithoutSensitive as User, plainPassword };
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

  /**
   * Lista todos los usuarios (para admin)
   */
  async findAll(): Promise<User[]> {
    const users = await this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });
    // Limpiar datos sensibles
    return users.map(u => {
      const { password: _, refreshToken: __, ...userWithoutSensitive } = u;
      return userWithoutSensitive as User;
    });
  }

  /**
   * Genera un código de verificación de 6 dígitos
   */
  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Guarda el código de verificación para un usuario
   */
  async setVerificationCode(userId: number): Promise<string> {
    const code = this.generateVerificationCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await this.usersRepository.update(userId, {
      verificationCode: code,
      verificationExpires: expires,
    });

    return code;
  }

  /**
   * Verifica el código de un usuario
   */
  async verifyEmail(userId: number, code: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    
    if (!user || !user.verificationCode || !user.verificationExpires) {
      return false;
    }

    // Verificar expiración
    if (new Date() > user.verificationExpires) {
      return false;
    }

    // Verificar código
    if (user.verificationCode !== code) {
      return false;
    }

    // Marcar como verificado
    await this.usersRepository.update(userId, {
      emailVerified: true,
      verificationCode: null,
      verificationExpires: null,
    });

    return true;
  }

  /**
   * Busca usuario por código de verificación pendiente
   */
  async findByVerificationCode(email: string, code: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: {
        email,
        verificationCode: code,
      },
    });
  }

  /**
   * Actualiza el email de un usuario
   */
  async updateEmail(userId: number, newEmail: string): Promise<User | null> {
    if (!newEmail || !newEmail.includes('@')) {
      throw new BadRequestException('Email inválido');
    }

    // Verificar si el email ya está en uso por otro usuario
    const existingUser = await this.findByEmail(newEmail);
    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Este email ya está registrado por otro usuario');
    }

    await this.usersRepository.update(userId, {
      email: newEmail,
      emailVerified: false, // Requiere re-verificación
    });

    const updatedUser = await this.findById(userId);
    this.logger.log(`Email actualizado para usuario ${userId}`);
    return updatedUser;
  }

  /**
   * Actualiza datos del perfil del usuario
   */
  async updateProfile(userId: number, data: { displayName?: string; email?: string }): Promise<User | null> {
    const updateData: Partial<User> = {};

    if (data.displayName !== undefined) {
      updateData.displayName = data.displayName;
    }

    if (data.email !== undefined) {
      return this.updateEmail(userId, data.email);
    }

    if (Object.keys(updateData).length > 0) {
      await this.usersRepository.update(userId, updateData);
    }

    return this.findById(userId);
  }
}
