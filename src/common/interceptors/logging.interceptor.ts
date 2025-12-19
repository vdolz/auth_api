import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...(body as Record<string, unknown>) };
    if ('password' in sanitized) {
      sanitized.password = '***REDACTED***';
    }
    return sanitized;
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.ip ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, body } = request;
    const clientIp = this.getClientIp(request);
    const userAgent = request.get('user-agent') || 'unknown';
    const startTime = Date.now();

    const sanitizedBody = this.sanitizeBody(body);

    this.logger.log(
      `${method} ${url} - ${clientIp} - ${userAgent} - Body: ${JSON.stringify(sanitizedBody)}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;
          const duration = Date.now() - startTime;

          this.logger.log(
            `${method} ${url} ${statusCode} - ${clientIp} - ${duration}ms`,
          );

          if (url.includes('/auth/login') || url.includes('/auth/register')) {
            const eventType = url.includes('/login') ? 'LOGIN' : 'REGISTER';
            const username =
              (sanitizedBody &&
                typeof sanitizedBody === 'object' &&
                'username' in sanitizedBody &&
                typeof sanitizedBody.username === 'string'
                ? sanitizedBody.username
                : 'unknown') || 'unknown';
            const success = statusCode >= 200 && statusCode < 300;

            this.logger.log(
              `[AUDIT] ${eventType} ${success ? 'SUCCESS' : 'FAILED'} - Username: ${username} - IP: ${clientIp} - Status: ${statusCode}`,
            );
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.logger.error(
            `${method} ${url} ${statusCode} - ${clientIp} - ${duration}ms - Error: ${error.message}`,
          );

          if (url.includes('/auth/login') || url.includes('/auth/register')) {
            const eventType = url.includes('/login') ? 'LOGIN' : 'REGISTER';
            const username =
              (sanitizedBody &&
                typeof sanitizedBody === 'object' &&
                'username' in sanitizedBody &&
                typeof sanitizedBody.username === 'string'
                ? sanitizedBody.username
                : 'unknown') || 'unknown';

            this.logger.log(
              `[AUDIT] ${eventType} FAILED - Username: ${username} - IP: ${clientIp} - Status: ${statusCode} - Error: ${error.message}`,
            );
          }
        },
      }),
    );
  }
}
