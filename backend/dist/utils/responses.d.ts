import { Response } from 'express';
export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
    timestamp: string;
}
export declare const successResponse: <T>(res: Response, data: T, message?: string, statusCode?: number) => Response<ApiResponse<T>>;
export declare const errorResponse: (res: Response, message?: string, statusCode?: number, error?: string) => Response<ApiResponse>;
export declare const validationErrorResponse: (res: Response, message?: string, errors?: any) => Response<ApiResponse>;
export declare const notFoundResponse: (res: Response, message?: string) => Response<ApiResponse>;
export declare const unauthorizedResponse: (res: Response, message?: string) => Response<ApiResponse>;
export declare const forbiddenResponse: (res: Response, message?: string) => Response<ApiResponse>;
//# sourceMappingURL=responses.d.ts.map