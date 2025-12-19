import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { RedisService } from '../src/redis/redis.service';

describe('Authentication API (e2e)', () => {
  let app: INestApplication;
  let redisService: RedisService;
  const testUsername = `testuser_${Date.now()}`;
  const testPassword = 'Test123!@#';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    app.useGlobalFilters(new HttpExceptionFilter());

    redisService = moduleFixture.get<RedisService>(RedisService);

    await app.init();
  });

  afterAll(async () => {
    try {
      await redisService.delete(`user:${testUsername}`);
    } catch {
    }
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should successfully register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: testUsername,
          password: testPassword,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            'User registered successfully',
          );
          expect(res.body).toHaveProperty('username', testUsername);
        });
    });

    it('should return 409 Conflict when username already exists', async () => {
      const duplicateUsername = `duplicate_${Date.now()}`;

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: duplicateUsername,
          password: testPassword,
        })
        .expect(200);

      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: duplicateUsername,
          password: testPassword,
        })
        .expect(409)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 409);
          expect(res.body).toHaveProperty('message', 'Username already exists');
        });
    });

    it('should return 400 Bad Request when username is empty', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: '',
          password: testPassword,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 400);
        });
    });

    it('should return 400 Bad Request when password is too short', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: `test_${Date.now()}`,
          password: 'Short1!',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 400);
        });
    });

    it('should return 400 Bad Request when password lacks uppercase letter', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: `test_${Date.now()}`,
          password: 'test1234!@#',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 400);
        });
    });

    it('should return 400 Bad Request when password lacks lowercase letter', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: `test_${Date.now()}`,
          password: 'TEST1234!@#',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 400);
        });
    });

    it('should return 400 Bad Request when password lacks number', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: `test_${Date.now()}`,
          password: 'TestPassword!@#',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 400);
        });
    });

    it('should return 400 Bad Request when password lacks special character', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: `test_${Date.now()}`,
          password: 'Test12345',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 400);
        });
    });

    it('should return 400 Bad Request when password is missing', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: `test_${Date.now()}`,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 400);
        });
    });

    it('should return 400 Bad Request when username is missing', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          password: testPassword,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 400);
        });
    });
  });

  describe('POST /auth/login', () => {
    const loginUsername = `login_test_${Date.now()}`;
    const loginPassword = 'LoginTest123!@#';

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: loginUsername,
          password: loginPassword,
        })
        .expect(200);
    });

    afterAll(async () => {
      try {
        await redisService.delete(`user:${loginUsername}`);
      } catch {
      }
    });

    it('should successfully authenticate with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: loginUsername,
          password: loginPassword,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('token');
          expect(res.body).toHaveProperty('username', loginUsername);
          expect(typeof res.body.token).toBe('string');
          expect(res.body.token.length).toBeGreaterThan(0);
        });
    });

    it('should return 401 Unauthorized with invalid password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: loginUsername,
          password: 'WrongPassword123!@#',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 401);
          expect(res.body).toHaveProperty('message', 'Invalid credentials');
        });
    });

    it('should return 401 Unauthorized with non-existent username', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'nonexistent_user_12345',
          password: loginPassword,
        })
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 401);
          expect(res.body).toHaveProperty('message', 'Invalid credentials');
        });
    });

    it('should return 400 Bad Request when username is empty', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: '',
          password: loginPassword,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 400);
        });
    });

    it('should return 400 Bad Request when password is empty', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: loginUsername,
          password: '',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 400);
        });
    });

    it('should return 400 Bad Request when username is missing', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          password: loginPassword,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 400);
        });
    });

    it('should return 400 Bad Request when password is missing', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: loginUsername,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 400);
        });
    });

    it('should generate a valid JWT token on successful login', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: loginUsername,
          password: loginPassword,
        })
        .expect(200);

      const token = response.body.token;
      expect(token).toBeDefined();

      const parts = token.split('.');
      expect(parts.length).toBe(3);
    });
  });

  describe('Error Response Format', () => {
    it('should return errors in consistent JSON format', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'invalid_user',
          password: 'wrong',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode');
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('error');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('path');
        });
    });
  });
});
