import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Username for authentication',
    example: 'john_doe',
  })
  @IsString()
  @MinLength(1, { message: 'Username cannot be empty' })
  username: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePass123!',
  })
  @IsString()
  @MinLength(1, { message: 'Password cannot be empty' })
  password: string;
}
