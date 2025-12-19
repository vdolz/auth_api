import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT authentication token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({
    description: 'Authenticated username',
    example: 'john_doe',
  })
  username: string;
}

export class RegisterResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'User registered successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Registered username',
    example: 'john_doe',
  })
  username: string;
}
