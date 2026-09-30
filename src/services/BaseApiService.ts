import { ApiClient } from '../core/ApiClient';

/**
 * BaseApiService is the foundation for the Service Object Model (SOM) in API testing.
 * It encapsulates an ApiClient and provides a clean separation of endpoint definitions.
 */
export abstract class BaseApiService {
  constructor(protected readonly client: ApiClient) {}
}

export default BaseApiService;
