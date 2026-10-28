import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Standard success response shapes:
 *
 * Regular:
 * { status, statusCode, message, data: [...] }
 *
 * Paginated (when controller returns a payload with `pagination` key):
 * { status, statusCode, message, data: [...], pagination: { page, pageSize, totalRecords, totalPages } }
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();

    return next.handle().pipe(
      map((payload: Record<string, unknown>) => {
        const statusCode = response.statusCode;

        // Paginated response — controller signals this by including a `pagination` key
        if (payload?.pagination) {
          return {
            status: 'success',
            statusCode,
            message: payload.message ?? 'Request successful',
            data: payload.data ?? [],
            pagination: payload.pagination,
          };
        }

        // Regular response — normalise data into array
        const rawData = payload?.data;
        const data = Array.isArray(rawData) ? rawData : [rawData];

        return {
          status: 'success',
          statusCode,
          message: payload?.message ?? 'Request successful',
          data,
        };
      }),
    );
  }
}
