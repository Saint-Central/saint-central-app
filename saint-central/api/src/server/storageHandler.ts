/**
 * SaintCentral API - Storage Handler
 * Handles storage operations for the SaintCentral API
 */

import { Env } from "../index";
import { createClient } from "@supabase/supabase-js";
import { securityMiddleware, createResponse } from "./security";

/**
 * Handle storage requests
 */
export async function handleStorageRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");

  // Extract path parts: /storage/[action]/[bucket]/[...file_path]
  const action = pathParts[2];
  const bucketName = pathParts[3];
  const filePath = pathParts.slice(4).join("/");

  try {
    // Require authentication for all storage operations except public access
    if (action !== "public") {
      const security = await securityMiddleware(request, env, {
        requireAuth: true,
        // Only validate CSRF for mutations
        validateCsrf: ["upload", "move", "copy", "remove"].includes(action),
      });

      if (security.error) {
        return security.error;
      }
    }

    // Route to the appropriate handler
    switch (action) {
      case "buckets":
        return handleBucketOperation(request, env, bucketName, pathParts[4]);

      case "public":
        return handlePublicAccess(request, env, bucketName, filePath);

      case "upload":
        return handleFileUpload(request, env, bucketName, filePath);

      case "download":
        return handleFileDownload(request, env, bucketName, filePath);

      case "list":
        return handleFileList(request, env, bucketName, filePath);

      case "move":
        return handleFileMove(request, env, bucketName);

      case "copy":
        return handleFileCopy(request, env, bucketName);

      case "remove":
        return handleFileRemove(request, env, bucketName);

      case "sign":
        return handleSignedUrl(request, env, bucketName, filePath);

      default:
        return createResponse({ error: "Unknown storage action" }, 400);
    }
  } catch (error) {
    console.error("Storage handler error:", error);
    return createResponse(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      500,
    );
  }
}

/**
 * Handle bucket operations (create, list, get, update, delete)
 */
async function handleBucketOperation(
  request: Request,
  env: Env,
  bucketName: string,
  subAction?: string,
): Promise<Response> {
  // Initialize Supabase client
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // Route based on method and bucket name
  if (!bucketName) {
    // Operations on all buckets
    if (request.method === "GET") {
      // List all buckets
      const { data, error } = await supabase.storage.listBuckets();

      if (error) {
        return createResponse({ error: error.message }, 400);
      }

      return createResponse({ buckets: data }, 200);
    } else if (request.method === "POST") {
      // Create a new bucket
      try {
        const body = await request.json();

        const { data, error } = await supabase.storage.createBucket(body.name, {
          public: body.public || false,
          fileSizeLimit: body.file_size_limit,
          allowedMimeTypes: body.allowed_mime_types,
        });

        if (error) {
          return createResponse({ error: error.message }, 400);
        }

        return createResponse({ bucket: data }, 201);
      } catch (error) {
        return createResponse({ error: "Invalid request body" }, 400);
      }
    } else {
      return createResponse({ error: "Method not allowed" }, 405);
    }
  } else {
    // Operations on a specific bucket
    if (subAction === "empty") {
      // Empty a bucket
      if (request.method === "POST") {
        // Because the Supabase JS client seems to have an issue with emptyBucket,
        // let's use a more direct API call approach
        try {
          // Direct API call to empty bucket
          const response = await fetch(
            `${env.SUPABASE_URL}/storage/v1/bucket/${bucketName}/empty`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                apikey: env.SUPABASE_SERVICE_ROLE_KEY,
              },
            },
          );

          if (!response.ok) {
            const errorData = await response.json();
            return createResponse(
              { error: errorData.error || "Failed to empty bucket" },
              response.status,
            );
          }

          return createResponse({ message: "Bucket emptied successfully" }, 200);
        } catch (error) {
          console.error("Error emptying bucket:", error);
          return createResponse({ error: "Failed to empty bucket" }, 500);
        }
      } else {
        return createResponse({ error: "Method not allowed" }, 405);
      }
    } else {
      // Regular bucket operations
      switch (request.method) {
        case "GET":
          // Get bucket details
          const { data, error } = await supabase.storage.getBucket(bucketName);

          if (error) {
            return createResponse({ error: error.message }, 400);
          }

          return createResponse({ bucket: data }, 200);

        case "PUT":
          // Update bucket
          try {
            const body = await request.json();

            const { data, error } = await supabase.storage.updateBucket(bucketName, {
              public: body.public,
              fileSizeLimit: body.file_size_limit,
              allowedMimeTypes: body.allowed_mime_types,
            });

            if (error) {
              return createResponse({ error: error.message }, 400);
            }

            return createResponse({ bucket: data }, 200);
          } catch (error) {
            return createResponse({ error: "Invalid request body" }, 400);
          }

        case "DELETE":
          // Delete bucket
          const force = new URL(request.url).searchParams.get("force") === "true";

          // The deleteBucket method now takes options as a possible second parameter
          const deleteResult = await supabase.storage.deleteBucket(bucketName);

          if (deleteResult.error) {
            return createResponse({ error: deleteResult.error.message }, 400);
          }

          return createResponse({ message: "Bucket deleted successfully" }, 200);

        default:
          return createResponse({ error: "Method not allowed" }, 405);
      }
    }
  }
}

/**
 * Handle public file access
 */
async function handlePublicAccess(
  request: Request,
  env: Env,
  bucketName: string,
  filePath: string,
): Promise<Response> {
  if (request.method !== "GET") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  // Initialize Supabase client
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // Check if bucket is public
  const { data: bucket, error: bucketError } = await supabase.storage.getBucket(bucketName);

  if (bucketError) {
    return createResponse({ error: bucketError.message }, 400);
  }

  if (!bucket.public) {
    return createResponse({ error: "Bucket is not public" }, 403);
  }

  // Get file data
  const { data, error } = await supabase.storage.from(bucketName).download(filePath);

  if (error) {
    return createResponse({ error: error.message }, 404);
  }

  // Get content type
  const contentType = data.type || "application/octet-stream";

  // Return the file
  return new Response(data, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

/**
 * Handle file upload
 */
async function handleFileUpload(
  request: Request,
  env: Env,
  bucketName: string,
  filePath: string,
): Promise<Response> {
  if (request.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  // Get query params
  const url = new URL(request.url);
  const upsert = url.searchParams.get("upsert") === "true";

  // Check if the request is multipart/form-data
  if (!request.headers.get("Content-Type")?.includes("multipart/form-data")) {
    return createResponse({ error: "Expected multipart/form-data" }, 400);
  }

  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return createResponse({ error: "No file provided" }, 400);
    }

    // Get additional options
    const cacheControl = (formData.get("cacheControl") as string) || undefined;
    const contentType = (formData.get("contentType") as string) || file.type;

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Upload file
    const { data, error } = await supabase.storage.from(bucketName).upload(filePath, file, {
      cacheControl,
      contentType,
      upsert,
    });

    if (error) {
      return createResponse({ error: error.message }, 400);
    }

    return createResponse({ file: data }, 201);
  } catch (error) {
    console.error("File upload error:", error);
    return createResponse({ error: "Failed to process file upload" }, 500);
  }
}

/**
 * Handle file download
 */
async function handleFileDownload(
  request: Request,
  env: Env,
  bucketName: string,
  filePath: string,
): Promise<Response> {
  if (request.method !== "GET") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  // Get transform params if any
  const url = new URL(request.url);
  const width = url.searchParams.get("width")
    ? parseInt(url.searchParams.get("width")!)
    : undefined;
  const height = url.searchParams.get("height")
    ? parseInt(url.searchParams.get("height")!)
    : undefined;
  const quality = url.searchParams.get("quality")
    ? parseInt(url.searchParams.get("quality")!)
    : undefined;

  const transform = width || height || quality ? { width, height, quality } : undefined;

  // Initialize Supabase client
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // Download file
  const { data, error } = await supabase.storage.from(bucketName).download(filePath, { transform });

  if (error) {
    return createResponse({ error: error.message }, 404);
  }

  // Get content type
  const contentType = data.type || "application/octet-stream";

  // Return the file
  return new Response(data, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

/**
 * Handle file listing
 */
async function handleFileList(
  request: Request,
  env: Env,
  bucketName: string,
  filePath: string,
): Promise<Response> {
  if (request.method !== "GET") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  // Get query params
  const url = new URL(request.url);
  const limit = url.searchParams.get("limit")
    ? parseInt(url.searchParams.get("limit")!)
    : undefined;
  const offset = url.searchParams.get("offset")
    ? parseInt(url.searchParams.get("offset")!)
    : undefined;
  const sort = url.searchParams.get("sort") || undefined;
  const order = url.searchParams.get("order") as "asc" | "desc" | undefined;
  const search = url.searchParams.get("search") || undefined;

  // Initialize Supabase client
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // List files
  const { data, error } = await supabase.storage.from(bucketName).list(filePath, {
    limit,
    offset,
    sortBy: sort && order ? { column: sort, order } : undefined,
    search,
  });

  if (error) {
    return createResponse({ error: error.message }, 400);
  }

  return createResponse({ files: data }, 200);
}

/**
 * Handle file move
 */
async function handleFileMove(request: Request, env: Env, bucketName: string): Promise<Response> {
  if (request.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await request.json();

    if (!body.fromPath || !body.toPath) {
      return createResponse({ error: "fromPath and toPath are required" }, 400);
    }

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Move file
    const { data, error } = await supabase.storage
      .from(bucketName)
      .move(body.fromPath, body.toPath);

    if (error) {
      return createResponse({ error: error.message }, 400);
    }

    return createResponse({ file: data }, 200);
  } catch (error) {
    return createResponse({ error: "Invalid request body" }, 400);
  }
}

/**
 * Handle file copy
 */
async function handleFileCopy(request: Request, env: Env, bucketName: string): Promise<Response> {
  if (request.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await request.json();

    if (!body.fromPath || !body.toPath) {
      return createResponse({ error: "fromPath and toPath are required" }, 400);
    }

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Copy file
    const { data, error } = await supabase.storage
      .from(bucketName)
      .copy(body.fromPath, body.toPath);

    if (error) {
      return createResponse({ error: error.message }, 400);
    }

    return createResponse({ file: data }, 200);
  } catch (error) {
    return createResponse({ error: "Invalid request body" }, 400);
  }
}

/**
 * Handle file removal
 */
async function handleFileRemove(request: Request, env: Env, bucketName: string): Promise<Response> {
  if (request.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await request.json();

    if (!body.paths || (!Array.isArray(body.paths) && typeof body.paths !== "string")) {
      return createResponse({ error: "paths parameter must be a string or array of strings" }, 400);
    }

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Remove file(s)
    const { error } = await supabase.storage.from(bucketName).remove(body.paths);

    if (error) {
      return createResponse({ error: error.message }, 400);
    }

    return createResponse({ message: "File(s) removed successfully" }, 200);
  } catch (error) {
    return createResponse({ error: "Invalid request body" }, 400);
  }
}

/**
 * Handle signed URL generation
 */
async function handleSignedUrl(
  request: Request,
  env: Env,
  bucketName: string,
  filePath: string,
): Promise<Response> {
  if (request.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await request.json();
    const expiresIn = body.expiresIn || 3600; // Default to 1 hour

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Create signed URL
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      return createResponse({ error: error.message }, 400);
    }

    return createResponse({ signedUrl: data.signedUrl }, 200);
  } catch (error) {
    return createResponse({ error: "Invalid request body" }, 400);
  }
}
