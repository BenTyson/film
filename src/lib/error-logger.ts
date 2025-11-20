import { prisma } from './prisma';

interface ErrorLogParams {
  userId?: number;
  endpoint: string;
  method: string;
  statusCode: number;
  errorMessage: string;
  stackTrace?: string;
  requestBody?: Record<string, string | number | boolean | null>;
  requestParams?: Record<string, string | number | boolean | null>;
}

/**
 * Log an error to the database
 * This function is designed to never throw errors to avoid creating an error loop
 */
export async function logError({
  userId,
  endpoint,
  method,
  statusCode,
  errorMessage,
  stackTrace,
  requestBody,
  requestParams,
}: ErrorLogParams): Promise<void> {
  try {
    await prisma.error_logs.create({
      data: {
        user_id: userId,
        endpoint,
        method,
        status_code: statusCode,
        error_message: errorMessage,
        stack_trace: stackTrace,
        request_body: requestBody ? JSON.parse(JSON.stringify(requestBody)) : null,
        request_params: requestParams ? JSON.parse(JSON.stringify(requestParams)) : null,
      },
    });
  } catch (error) {
    // Only log to console - don't create an error loop
    console.error('Failed to log error to database:', error);
  }
}

/**
 * Helper function to extract request details from NextRequest
 */
export function getRequestDetails(request: Request) {
  const url = new URL(request.url);
  const endpoint = url.pathname;
  const method = request.method;

  // Extract query parameters
  const requestParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    requestParams[key] = value;
  });

  return { endpoint, method, requestParams };
}

/**
 * Higher-order function to wrap API handlers with automatic error logging
 */
export function withErrorLogging<T>(
  handler: (request: Request, ...args: unknown[]) => Promise<T>,
  endpoint?: string
) {
  return async (request: Request, ...args: unknown[]): Promise<T> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      const { endpoint: detectedEndpoint, method } = getRequestDetails(request);
      const finalEndpoint = endpoint || detectedEndpoint;

      await logError({
        endpoint: finalEndpoint,
        method,
        statusCode: 500,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stackTrace: error instanceof Error ? error.stack : undefined,
      });

      throw error; // Re-throw to let the API handler deal with the response
    }
  };
}
