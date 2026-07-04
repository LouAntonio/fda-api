import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
	success: boolean;
	msg: string;
	data?: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
	T,
	ApiResponse<T>
> {
	intercept(
		context: ExecutionContext,
		next: CallHandler,
	): Observable<ApiResponse<T>> {
		return next.handle().pipe(
			map((responseBody: unknown) => {
				const body = responseBody as Record<string, unknown> | null;

				if (body && typeof body === 'object' && 'success' in body) {
					return body as unknown as ApiResponse<T>;
				}

				if (Array.isArray(body)) {
					return {
						success: true,
						msg: '',
						data: body as T,
					};
				}

				if (body && typeof body === 'object' && 'data' in body) {
					return {
						success: true,
						msg: typeof body.msg === 'string' ? body.msg : '',
						data: body.data as T,
					};
				}

				const { msg: _msg, ...rest } = body ?? {};

				return {
					success: true,
					msg: typeof _msg === 'string' ? _msg : '',
					data: Object.keys(rest).length ? (rest as T) : undefined,
				};
			}),
		);
	}
}
