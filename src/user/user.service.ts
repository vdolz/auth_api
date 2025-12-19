import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { RedisService } from '../redis/redis.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  private readonly SALT_ROUNDS = 10;
  private readonly USER_KEY_PREFIX = 'user:';

  constructor(
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private getUserKey(username: string): string {
    return `${this.USER_KEY_PREFIX}${username}`;
  }

  async createUser(
    createUserDto: CreateUserDto,
  ): Promise<{ username: string }> {
    const { username, password } = createUserDto;
    const userKey = this.getUserKey(username);

    const userExists = await this.redisService.exists(userKey);
    if (userExists) {
      throw new ConflictException('Username already exists');
    }

    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

    const user: User = {
      username,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    await this.redisService.set(userKey, JSON.stringify(user));

    return { username };
  }

  async authenticate(
    loginDto: LoginDto,
  ): Promise<{ token: string; username: string }> {
    const { username, password } = loginDto;
    const userKey = this.getUserKey(username);

    const userData = await this.redisService.get(userKey);
    if (!userData) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user: User = JSON.parse(userData);

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { username: user.username };
    const token = this.jwtService.sign(payload);

    return {
      token,
      username: user.username,
    };
  }
}
