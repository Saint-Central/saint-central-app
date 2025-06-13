// utils/crudClient.ts
import { useAuth } from "@/contexts/AuthContext";

// CRUD Worker API configuration
const CRUD_WORKER_URL = "https://crud-worker.colinmcherney.workers.dev";

export interface CRUDRequest {
  operation: "SELECT" | "INSERT" | "UPDATE" | "DELETE";
  table: string;
  data?: Record<string, any>;
  where?: Record<string, any>;
  select?: string;
  limit?: number;
  offset?: number;
  order?: string;
  nonce?: string;
}

export interface CRUDResponse {
  success: boolean;
  data?: any;
  operation: string;
  count?: number;
  message?: string;
  error?: string;
  code?: string;
  timestamp?: string;
  responseTime?: string;
  requestId?: string;
}

// Generate a secure nonce for replay protection
function generateNonce(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Core CRUD client class
export class CRUDClient {
  private getAccessToken: () => Promise<string | null>;

  constructor(getAccessToken: () => Promise<string | null>) {
    this.getAccessToken = getAccessToken;
  }

  async makeRequest(request: CRUDRequest): Promise<CRUDResponse> {
    try {
      const accessToken = await this.getAccessToken();

      if (!accessToken) {
        throw new Error("Auth session missing! Please log in.");
      }

      const response = await fetch(CRUD_WORKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...request,
          nonce: generateNonce(), // Add nonce for replay protection
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: CRUDResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || "CRUD operation failed");
      }

      return data;
    } catch (error) {
      console.error("Error getting user:", error);
      throw error;
    }
  }

  // Convenience methods for each operation
  async select(
    table: string,
    options: {
      select?: string;
      where?: Record<string, any>;
      limit?: number;
      offset?: number;
      order?: string;
    } = {},
  ): Promise<any[]> {
    const response = await this.makeRequest({
      operation: "SELECT",
      table,
      ...options,
    });
    return response.data || [];
  }

  async selectOne(
    table: string,
    options: {
      select?: string;
      where?: Record<string, any>;
      order?: string;
    } = {},
  ): Promise<any | null> {
    const response = await this.makeRequest({
      operation: "SELECT",
      table,
      limit: 1,
      ...options,
    });
    const data = response.data || [];
    return data.length > 0 ? data[0] : null;
  }

  async insert(table: string, data: Record<string, any>): Promise<any> {
    const response = await this.makeRequest({
      operation: "INSERT",
      table,
      data,
    });
    return response.data;
  }

  async update(table: string, data: Record<string, any>, where: Record<string, any>): Promise<any> {
    const response = await this.makeRequest({
      operation: "UPDATE",
      table,
      data,
      where,
    });
    return response.data;
  }

  async delete(table: string, where: Record<string, any>): Promise<void> {
    await this.makeRequest({
      operation: "DELETE",
      table,
      where,
    });
  }
}

// React hook for using the CRUD client
export function useCRUD() {
  const { getAccessToken } = useAuth();

  const client = new CRUDClient(getAccessToken);

  return {
    // Direct client access for complex operations
    client,

    // Convenience methods
    select: client.select.bind(client),
    selectOne: client.selectOne.bind(client),
    insert: client.insert.bind(client),
    update: client.update.bind(client),
    delete: client.delete.bind(client),
  };
}

// Standalone function for use outside of React components
export async function createCRUDClient(getAccessToken: () => Promise<string | null>) {
  return new CRUDClient(getAccessToken);
}
