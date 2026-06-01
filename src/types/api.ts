export interface ApiResponse<T> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface ApiListResponse<T> {
  success: boolean;
  error?: string;
  records: T[];
}

export interface ApiSingleResponse<T> {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}
