/**
 * SaintCentral SDK - Storage Module
 * Handles file storage operations like upload, download, and management
 */

import auth from "./auth";
import { hashString } from "../shared/securityUtils";

// Types
export interface FileOptions {
  cacheControl?: string;
  contentType?: string;
  upsert?: boolean;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: {
    column: string;
    order: "asc" | "desc";
  };
  search?: string;
}

export interface FileObject {
  name: string;
  bucket_id: string;
  owner?: string;
  id?: string;
  updated_at?: string;
  created_at?: string;
  last_accessed_at?: string;
  size?: number;
  metadata?: Record<string, any>;
  bucketName?: string;
  contentType?: string;
}

export interface BucketObject {
  id: string;
  name: string;
  owner?: string;
  public?: boolean;
  created_at?: string;
  updated_at?: string;
  file_size_limit?: number;
  allowed_mime_types?: string[];
}

// Error interface
export interface Error {
  message: string;
  status?: number;
}

/**
 * Storage client for handling file operations
 */
export class StorageClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string> = {};

  constructor(baseUrl = "") {
    this.baseUrl = baseUrl || "https://saint-central-api.colinmcherney.workers.dev";
  }

  /**
   * Get the URL for a public file
   */
  getPublicUrl(bucketName: string, filePath: string): string {
    const encodedBucketName = encodeURIComponent(bucketName);
    const encodedFilePath = this._cleanPath(filePath);
    return `${this.baseUrl}/storage/public/${encodedBucketName}/${encodedFilePath}`;
  }

  /**
   * List all buckets
   */
  async listBuckets(): Promise<{ data: BucketObject[]; error: Error | null }> {
    try {
      const response = await this._fetch(`${this.baseUrl}/storage/buckets`, {
        method: "GET",
      });

      if (!response.ok) {
        const error = await this._handleErrorResponse(response);
        return { data: [], error };
      }

      const data = await response.json();
      return { data: data.buckets || [], error: null };
    } catch (error) {
      return {
        data: [],
        error: this._handleError(error),
      };
    }
  }

  /**
   * Get a bucket by name
   */
  async getBucket(bucketName: string): Promise<{ data: BucketObject | null; error: Error | null }> {
    try {
      const encodedBucketName = encodeURIComponent(bucketName);
      const response = await this._fetch(`${this.baseUrl}/storage/buckets/${encodedBucketName}`, {
        method: "GET",
      });

      if (!response.ok) {
        const error = await this._handleErrorResponse(response);
        return { data: null, error };
      }

      const data = await response.json();
      return { data: data.bucket || null, error: null };
    } catch (error) {
      return {
        data: null,
        error: this._handleError(error),
      };
    }
  }

  /**
   * Create a new bucket
   */
  async createBucket(
    bucketName: string,
    options: {
      public?: boolean;
      fileSizeLimit?: number;
      allowedMimeTypes?: string[];
    } = {},
  ): Promise<{ data: BucketObject | null; error: Error | null }> {
    try {
      const response = await this._fetch(`${this.baseUrl}/storage/buckets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: bucketName,
          public: options.public || false,
          file_size_limit: options.fileSizeLimit,
          allowed_mime_types: options.allowedMimeTypes,
        }),
      });

      if (!response.ok) {
        const error = await this._handleErrorResponse(response);
        return { data: null, error };
      }

      const data = await response.json();
      return { data: data.bucket || null, error: null };
    } catch (error) {
      return {
        data: null,
        error: this._handleError(error),
      };
    }
  }

  /**
   * Update a bucket
   */
  async updateBucket(
    bucketName: string,
    options: {
      public?: boolean;
      fileSizeLimit?: number;
      allowedMimeTypes?: string[];
    },
  ): Promise<{ data: BucketObject | null; error: Error | null }> {
    try {
      const encodedBucketName = encodeURIComponent(bucketName);
      const response = await this._fetch(`${this.baseUrl}/storage/buckets/${encodedBucketName}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          public: options.public,
          file_size_limit: options.fileSizeLimit,
          allowed_mime_types: options.allowedMimeTypes,
        }),
      });

      if (!response.ok) {
        const error = await this._handleErrorResponse(response);
        return { data: null, error };
      }

      const data = await response.json();
      return { data: data.bucket || null, error: null };
    } catch (error) {
      return {
        data: null,
        error: this._handleError(error),
      };
    }
  }

  /**
   * Delete a bucket
   */
  async deleteBucket(
    bucketName: string,
    options: { force?: boolean } = {},
  ): Promise<{ error: Error | null }> {
    try {
      const encodedBucketName = encodeURIComponent(bucketName);
      const url = new URL(`${this.baseUrl}/storage/buckets/${encodedBucketName}`);

      if (options.force) {
        url.searchParams.append("force", "true");
      }

      const response = await this._fetch(url.toString(), {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await this._handleErrorResponse(response);
        return { error };
      }

      return { error: null };
    } catch (error) {
      return {
        error: this._handleError(error),
      };
    }
  }

  /**
   * Empty a bucket (delete all objects)
   */
  async emptyBucket(bucketName: string): Promise<{ error: Error | null }> {
    try {
      const encodedBucketName = encodeURIComponent(bucketName);
      const response = await this._fetch(
        `${this.baseUrl}/storage/buckets/${encodedBucketName}/empty`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const error = await this._handleErrorResponse(response);
        return { error };
      }

      return { error: null };
    } catch (error) {
      return {
        error: this._handleError(error),
      };
    }
  }

  /**
   * From method for bucket operations
   */
  from(bucketName: string): BucketClient {
    return new BucketClient(this.baseUrl, bucketName);
  }

  // PRIVATE METHODS

  /**
   * Clean a file path
   */
  private _cleanPath(path: string): string {
    return path.replace(/^\/+/, "");
  }

  /**
   * Handle error response
   */
  private async _handleErrorResponse(response: Response): Promise<Error> {
    try {
      const error = await response.json();
      return {
        message: error.error || error.message || "Unknown error",
        status: response.status,
      };
    } catch (e) {
      return {
        message: `HTTP error ${response.status}`,
        status: response.status,
      };
    }
  }

  /**
   * Handle general errors
   */
  private _handleError(error: any): Error {
    return {
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }

  /**
   * Fetch with authentication
   */
  private async _fetch(url: RequestInfo, options: RequestInit = {}): Promise<Response> {
    const authToken = auth.getAuthToken();
    const csrfToken = auth.getCsrfToken();

    const headers = new Headers(options.headers || {});

    if (authToken) {
      headers.set("Authorization", `Bearer ${authToken}`);
    }

    if (
      csrfToken &&
      (options.method === "POST" || options.method === "PUT" || options.method === "DELETE")
    ) {
      headers.set("X-CSRF-Token", csrfToken);
    }

    // Merge with default headers
    for (const [key, value] of Object.entries(this.defaultHeaders)) {
      headers.set(key, value);
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });
  }
}

/**
 * BucketClient for per-bucket operations
 */
export class BucketClient {
  private baseUrl: string;
  private bucketName: string;
  private storage: StorageClient;

  constructor(baseUrl: string, bucketName: string) {
    this.baseUrl = baseUrl;
    this.bucketName = bucketName;
    this.storage = new StorageClient(baseUrl);
  }

  /**
   * Upload a file
   */
  async upload(
    path: string,
    fileBody: File | Blob | ArrayBuffer | ArrayBufferView | string,
    options: FileOptions = {},
  ): Promise<{ data: FileObject | null; error: Error | null }> {
    try {
      const encodedBucketName = encodeURIComponent(this.bucketName);
      const encodedPath = this._cleanPath(path);
      const url = new URL(
        `${this.baseUrl}/storage/buckets/${encodedBucketName}/upload/${encodedPath}`,
      );

      if (options.upsert) {
        url.searchParams.append("upsert", "true");
      }

      const formData = new FormData();

      // Handle different file body types
      if (fileBody instanceof File) {
        formData.append("file", fileBody);
      } else if (fileBody instanceof Blob) {
        formData.append("file", fileBody);
      } else if (fileBody instanceof ArrayBuffer || ArrayBuffer.isView(fileBody)) {
        const blob = new Blob([fileBody]);
        formData.append("file", blob);
      } else if (typeof fileBody === "string") {
        // For data URLs or base64, convert to blob
        if (fileBody.startsWith("data:")) {
          const res = await fetch(fileBody);
          const blob = await res.blob();
          formData.append("file", blob);
        } else {
          // Treat as text
          const blob = new Blob([fileBody], { type: "text/plain" });
          formData.append("file", blob);
        }
      }

      // Add options as metadata
      if (options.cacheControl) {
        formData.append("cacheControl", options.cacheControl);
      }

      if (options.contentType) {
        formData.append("contentType", options.contentType);
      }

      const authToken = auth.getAuthToken();
      const csrfToken = auth.getCsrfToken();

      const headers: Record<string, string> = {};

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      if (csrfToken) {
        headers["X-CSRF-Token"] = csrfToken;
      }

      const response = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await this._handleErrorResponse(response);
        return { data: null, error };
      }

      const data = await response.json();
      return { data: data.file || null, error: null };
    } catch (error) {
      return {
        data: null,
        error: this._handleError(error),
      };
    }
  }

  /**
   * Download a file
   */
  async download(
    path: string,
    options: { transform?: { width?: number; height?: number; quality?: number } } = {},
  ): Promise<{ data: Blob | null; error: Error | null }> {
    try {
      const encodedBucketName = encodeURIComponent(this.bucketName);
      const encodedPath = this._cleanPath(path);
      const url = new URL(
        `${this.baseUrl}/storage/buckets/${encodedBucketName}/download/${encodedPath}`,
      );

      // Add image transform params if provided
      if (options.transform) {
        const { width, height, quality } = options.transform;
        if (width) url.searchParams.append("width", width.toString());
        if (height) url.searchParams.append("height", height.toString());
        if (quality) url.searchParams.append("quality", quality.toString());
      }

      const authToken = auth.getAuthToken();

      const headers: Record<string, string> = {};

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await this._handleErrorResponse(response);
        return { data: null, error };
      }

      const data = await response.blob();
      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: this._handleError(error),
      };
    }
  }

  /**
   * List files in a bucket with pagination and filtering
   */
  async list(
    path: string = "",
    options: SearchOptions = {},
  ): Promise<{ data: FileObject[]; error: Error | null }> {
    try {
      const encodedBucketName = encodeURIComponent(this.bucketName);
      const encodedPath = this._cleanPath(path);
      const url = new URL(
        `${this.baseUrl}/storage/buckets/${encodedBucketName}/list/${encodedPath}`,
      );

      // Add query parameters
      if (options.limit) url.searchParams.append("limit", options.limit.toString());
      if (options.offset) url.searchParams.append("offset", options.offset.toString());
      if (options.search) url.searchParams.append("search", options.search);
      if (options.sortBy) {
        url.searchParams.append("sort", options.sortBy.column);
        url.searchParams.append("order", options.sortBy.order);
      }

      const response = await this._fetch(url.toString(), {
        method: "GET",
      });

      if (!response.ok) {
        const error = await this._handleErrorResponse(response);
        return { data: [], error };
      }

      const data = await response.json();
      return { data: data.files || [], error: null };
    } catch (error) {
      return {
        data: [],
        error: this._handleError(error),
      };
    }
  }

  /**
   * Move a file
   */
  async move(
    fromPath: string,
    toPath: string,
  ): Promise<{ data: FileObject | null; error: Error | null }> {
    try {
      const encodedBucketName = encodeURIComponent(this.bucketName);
      const response = await this._fetch(
        `${this.baseUrl}/storage/buckets/${encodedBucketName}/move`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fromPath: this._cleanPath(fromPath),
            toPath: this._cleanPath(toPath),
          }),
        },
      );

      if (!response.ok) {
        const error = await this._handleErrorResponse(response);
        return { data: null, error };
      }

      const data = await response.json();
      return { data: data.file || null, error: null };
    } catch (error) {
      return {
        data: null,
        error: this._handleError(error),
      };
    }
  }

  /**
   * Copy a file
   */
  async copy(
    fromPath: string,
    toPath: string,
  ): Promise<{ data: FileObject | null; error: Error | null }> {
    try {
      const encodedBucketName = encodeURIComponent(this.bucketName);
      const response = await this._fetch(
        `${this.baseUrl}/storage/buckets/${encodedBucketName}/copy`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fromPath: this._cleanPath(fromPath),
            toPath: this._cleanPath(toPath),
          }),
        },
      );

      if (!response.ok) {
        const error = await this._handleErrorResponse(response);
        return { data: null, error };
      }

      const data = await response.json();
      return { data: data.file || null, error: null };
    } catch (error) {
      return {
        data: null,
        error: this._handleError(error),
      };
    }
  }

  /**
   * Remove a file
   */
  async remove(paths: string | string[]): Promise<{ error: Error | null }> {
    try {
      const encodedBucketName = encodeURIComponent(this.bucketName);
      const pathArray = Array.isArray(paths) ? paths : [paths];
      const cleanedPaths = pathArray.map((path) => this._cleanPath(path));

      const response = await this._fetch(
        `${this.baseUrl}/storage/buckets/${encodedBucketName}/remove`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paths: cleanedPaths,
          }),
        },
      );

      if (!response.ok) {
        const error = await this._handleErrorResponse(response);
        return { error };
      }

      return { error: null };
    } catch (error) {
      return {
        error: this._handleError(error),
      };
    }
  }

  /**
   * Create a signed URL for temporary file access
   */
  async createSignedUrl(
    path: string,
    expiresIn: number = 3600,
  ): Promise<{ data: { signedUrl: string; path: string } | null; error: Error | null }> {
    try {
      const encodedBucketName = encodeURIComponent(this.bucketName);
      const encodedPath = this._cleanPath(path);

      const response = await this._fetch(
        `${this.baseUrl}/storage/buckets/${encodedBucketName}/sign/${encodedPath}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            expiresIn,
          }),
        },
      );

      if (!response.ok) {
        const error = await this._handleErrorResponse(response);
        return { data: null, error };
      }

      const data = await response.json();
      return {
        data: {
          signedUrl: data.signedUrl,
          path: encodedPath,
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: this._handleError(error),
      };
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(path: string): string {
    return this.storage.getPublicUrl(this.bucketName, path);
  }

  // PRIVATE METHODS

  /**
   * Clean a file path
   */
  private _cleanPath(path: string): string {
    return path.replace(/^\/+/, "");
  }

  /**
   * Handle error response
   */
  private async _handleErrorResponse(response: Response): Promise<Error> {
    try {
      const error = await response.json();
      return {
        message: error.error || error.message || "Unknown error",
        status: response.status,
      };
    } catch (e) {
      return {
        message: `HTTP error ${response.status}`,
        status: response.status,
      };
    }
  }

  /**
   * Handle general errors
   */
  private _handleError(error: any): Error {
    return {
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }

  /**
   * Fetch with authentication
   */
  private async _fetch(url: RequestInfo, options: RequestInit = {}): Promise<Response> {
    const authToken = auth.getAuthToken();
    const csrfToken = auth.getCsrfToken();

    const headers = new Headers(options.headers || {});

    if (authToken) {
      headers.set("Authorization", `Bearer ${authToken}`);
    }

    if (
      csrfToken &&
      (options.method === "POST" || options.method === "PUT" || options.method === "DELETE")
    ) {
      headers.set("X-CSRF-Token", csrfToken);
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });
  }
}

// Create default storage instance
const storage = new StorageClient();

export default storage;
