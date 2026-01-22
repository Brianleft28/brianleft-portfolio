import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Servicio de Rate Limiting con Redis
 * Usado para limitar peticiones al chat por IP
 * 
 * Si Redis no está disponible, usa fallback en memoria
 */
@Injectable()
export class RateLimitService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RateLimitService.name);
  private redisClient: Redis | null = null;
  private isRedisConnected = false;
  
  // Fallback en memoria (por si Redis no está disponible)
  private memoryStore = new Map<string, { count: number; resetAt: number }>();

  // Configuración del free tier
  readonly FREE_TIER_LIMIT = 15; // 15 intentos por día
  readonly FREE_TIER_RESET_SECONDS = 24 * 60 * 60; // 24 horas

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connectRedis();
  }

  async onModuleDestroy() {
    await this.disconnectRedis();
  }

  private async connectRedis(): Promise<void> {
    const redisHost = this.configService.get('REDIS_HOST', 'redis');
    const redisPort = this.configService.get('REDIS_PORT', 6379);

    try {
      this.redisClient = new Redis({
        host: redisHost,
        port: parseInt(String(redisPort), 10),
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn('Redis max retries reached. Using memory fallback.');
            return null; // Stop retrying
          }
          return Math.min(times * 100, 3000);
        },
      });
      
      this.redisClient.on('error', (err) => {
        this.logger.warn(`Redis error: ${err.message}. Using memory fallback.`);
        this.isRedisConnected = false;
      });

      this.redisClient.on('connect', () => {
        this.logger.log('Connected to Redis for rate limiting');
        this.isRedisConnected = true;
      });

      this.redisClient.on('ready', () => {
        this.isRedisConnected = true;
      });

      // Test connection
      await this.redisClient.ping();
      this.isRedisConnected = true;
      this.logger.log('Redis connection verified');
    } catch (error) {
      this.logger.warn(`Failed to connect to Redis: ${error.message}. Using memory fallback.`);
      this.redisClient = null;
      this.isRedisConnected = false;
    }
  }

  private async disconnectRedis(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.redisClient = null;
      this.isRedisConnected = false;
    }
  }

  /**
   * Verifica si una IP puede hacer una petición al free tier
   */
  async checkLimit(ip: string): Promise<{ allowed: boolean; remaining: number; resetIn?: number }> {
    const key = `ratelimit:chat:${ip}`;

    if (this.isRedisConnected && this.redisClient) {
      return this.checkLimitRedis(key);
    }
    return this.checkLimitMemory(key);
  }

  /**
   * Incrementa el contador de uso para una IP
   */
  async incrementUsage(ip: string): Promise<void> {
    const key = `ratelimit:chat:${ip}`;

    if (this.isRedisConnected && this.redisClient) {
      await this.incrementRedis(key);
    } else {
      this.incrementMemory(key);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Implementación Redis (ioredis)
  // ═══════════════════════════════════════════════════════════════

  private async checkLimitRedis(key: string): Promise<{ allowed: boolean; remaining: number; resetIn?: number }> {
    try {
      const count = await this.redisClient!.get(key);
      const ttl = await this.redisClient!.ttl(key);

      if (count === null) {
        // Primera petición del día
        return { allowed: true, remaining: this.FREE_TIER_LIMIT };
      }

      const currentCount = parseInt(count, 10);
      const remaining = Math.max(0, this.FREE_TIER_LIMIT - currentCount);

      return {
        allowed: currentCount < this.FREE_TIER_LIMIT,
        remaining,
        resetIn: ttl > 0 ? ttl : undefined,
      };
    } catch (error) {
      this.logger.error(`Redis check error: ${error.message}`);
      return this.checkLimitMemory(key);
    }
  }

  private async incrementRedis(key: string): Promise<void> {
    try {
      const exists = await this.redisClient!.exists(key);
      
      if (!exists) {
        // Primera petición: crear key con TTL de 24h
        await this.redisClient!.setex(key, this.FREE_TIER_RESET_SECONDS, '1');
      } else {
        // Incrementar contador existente
        await this.redisClient!.incr(key);
      }
    } catch (error) {
      this.logger.error(`Redis increment error: ${error.message}`);
      this.incrementMemory(key);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Implementación Memory (Fallback)
  // ═══════════════════════════════════════════════════════════════

  private checkLimitMemory(key: string): { allowed: boolean; remaining: number; resetIn?: number } {
    const now = Date.now();
    const usage = this.memoryStore.get(key);

    if (!usage || now > usage.resetAt) {
      // Primera petición o expiró
      this.memoryStore.set(key, { 
        count: 0, 
        resetAt: now + (this.FREE_TIER_RESET_SECONDS * 1000) 
      });
      return { allowed: true, remaining: this.FREE_TIER_LIMIT };
    }

    const remaining = Math.max(0, this.FREE_TIER_LIMIT - usage.count);
    const resetIn = Math.floor((usage.resetAt - now) / 1000);

    return {
      allowed: usage.count < this.FREE_TIER_LIMIT,
      remaining,
      resetIn: resetIn > 0 ? resetIn : undefined,
    };
  }

  private incrementMemory(key: string): void {
    const now = Date.now();
    const usage = this.memoryStore.get(key);

    if (!usage || now > usage.resetAt) {
      this.memoryStore.set(key, {
        count: 1,
        resetAt: now + (this.FREE_TIER_RESET_SECONDS * 1000),
      });
    } else {
      usage.count++;
    }
  }

  /**
   * Limpia entradas expiradas del store de memoria
   * Llamar periódicamente para evitar memory leaks
   */
  cleanupExpired(): void {
    const now = Date.now();
    for (const [key, value] of this.memoryStore.entries()) {
      if (now > value.resetAt) {
        this.memoryStore.delete(key);
      }
    }
  }

  /**
   * Info de uso de Redis (para health checks)
   */
  isUsingRedis(): boolean {
    return this.isRedisConnected;
  }
}
