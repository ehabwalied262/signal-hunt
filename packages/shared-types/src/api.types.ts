/**
 * Standard API response wrapper.
 */
export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  errors?: string[];
  timestamp: string;
  path: string;
}

/**
 * Standard paginated response.
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
