/**
 * Centralised error handling for the Dataverse virtual-entity service layer.
 *
 * Virtual-entity writes bubble up errors from F&O (e.g. "Preparer must be
 * current worker"). We normalise every failure into an AppError with a
 * user-presentable message so the UI can surface it consistently.
 */

import type { IOperationResult } from '@microsoft/power-apps/data';

export class AppError extends Error {
  /** The underlying error, when available. */
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.cause = cause;
  }
}

/** Extract the most meaningful message from an unknown thrown value. */
export function toMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const anyErr = error as Record<string, unknown>;
    if (typeof anyErr.message === 'string') return anyErr.message;
  }
  return 'An unexpected error occurred while contacting Dataverse.';
}

/**
 * Unwrap an IOperationResult, throwing an AppError when the operation failed.
 * Keeps every service method free of repetitive success/error checks.
 */
export function unwrap<T>(result: IOperationResult<T>, context: string): T {
  if (!result.success || result.error) {
    throw new AppError(
      `${context}: ${result.error ? toMessage(result.error) : 'the request was not successful.'}`,
      result.error,
    );
  }
  return result.data;
}

/** Wrap an async service call so thrown/rejected values become AppErrors. */
export async function guard<T>(context: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`${context}: ${toMessage(error)}`, error);
  }
}
