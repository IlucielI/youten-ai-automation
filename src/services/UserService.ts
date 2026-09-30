import { BaseApiService } from './BaseApiService';
import { ApiResponse } from '../core/ApiClient';

export interface UserPayload {
  name: string;
  job: string;
}

export interface UserDto {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  avatar: string;
}

export interface PaginatedUsersResponse {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  data: UserDto[];
}

export interface CreatedUserResponse extends UserPayload {
  id: string;
  createdAt: string;
}

export interface UpdatedUserResponse extends Partial<UserPayload> {
  updatedAt: string;
}

/**
 * UserService models all /users API endpoints, parameters, and payloads.
 */
export class UserService extends BaseApiService {
  readonly endpoint = '/users';

  /**
   * Retrieves a paginated list of users
   */
  async listUsers(page: number = 1): Promise<ApiResponse<PaginatedUsersResponse>> {
    return await this.client.get<PaginatedUsersResponse>(this.endpoint, { params: { page } });
  }

  /**
   * Retrieves a single user profile by ID
   */
  async getUser(id: number | string): Promise<ApiResponse<{ data: UserDto }>> {
    return await this.client.get<{ data: UserDto }>(`${this.endpoint}/${id}`);
  }

  /**
   * Creates a new user profile
   */
  async createUser(payload: UserPayload): Promise<ApiResponse<CreatedUserResponse>> {
    return await this.client.post<CreatedUserResponse>(this.endpoint, payload);
  }

  /**
   * Updates an existing user profile
   */
  async updateUser(
    id: number | string,
    payload: Partial<UserPayload>,
  ): Promise<ApiResponse<UpdatedUserResponse>> {
    return await this.client.put<UpdatedUserResponse>(`${this.endpoint}/${id}`, payload);
  }

  /**
   * Deletes a user profile by ID
   */
  async deleteUser(id: number | string): Promise<ApiResponse> {
    return await this.client.delete(`${this.endpoint}/${id}`);
  }
}

export default UserService;
