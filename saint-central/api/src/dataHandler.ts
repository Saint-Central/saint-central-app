import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Env } from "./index";
import { securityMiddleware, createResponse } from "./security";
import { ALLOWED_TABLES, TABLE_PERMISSIONS } from "./tableConfig";

// Type definitions for operation type
type OperationType = "select" | "insert" | "update" | "delete";

interface SelectParams {
  table: string;
  columns?: string | string[];
  where?: Record<string, any>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  join?: {
    table: string;
    on: { foreignKey: string; primaryKey: string };
    columns?: string[];
  }[];
  single?: boolean;
}

interface InsertParams {
  table: string;
  data: Record<string, any> | Record<string, any>[];
}

interface UpdateParams {
  table: string;
  data: Record<string, any>;
  where: Record<string, any>;
}

interface DeleteParams {
  table: string;
  where: Record<string, any>;
}

/**
 * Universal API Router - Routes to the appropriate handler based on the operation
 */
export async function handleDataRequest(request: Request, env: Env): Promise<Response> {
  try {
    // Determine the operation type from the URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const operation = pathParts[pathParts.length - 1]; // Last part of the path

    // Handle different operation types
    switch (operation) {
      case "select":
        return handleSelect(request, env);
      case "insert":
        return handleInsert(request, env);
      case "update":
        return handleUpdate(request, env);
      case "delete":
        return handleDelete(request, env);
      default:
        return createResponse({ error: "Unknown operation" }, 400);
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return createResponse(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
}

/**
 * Handle SELECT operations
 */
async function handleSelect(request: Request, env: Env): Promise<Response> {
  try {
    // Parse parameters based on request method
    let selectParams: SelectParams;

    if (request.method === "GET") {
      const url = new URL(request.url);
      const table = url.searchParams.get("table");

      if (!table) {
        return createResponse({ error: "Missing required parameter: table" }, 400);
      }

      // Get columns parameter (default to *)
      const columnsParam = url.searchParams.get("columns");
      const columns = columnsParam ? columnsParam.split(",").map((col) => col.trim()) : "*";

      // Parse where conditions
      let where = {};
      const whereParam = url.searchParams.get("where");
      if (whereParam) {
        try {
          where = JSON.parse(whereParam);
        } catch (e) {
          return createResponse(
            { error: "Invalid where parameter format. Must be valid JSON." },
            400,
          );
        }
      }

      // Parse order by
      let order;
      const orderParam = url.searchParams.get("order");
      if (orderParam) {
        try {
          order = JSON.parse(orderParam);
        } catch (e) {
          return createResponse(
            { error: "Invalid order parameter format. Must be valid JSON." },
            400,
          );
        }
      }

      // Parse pagination
      const limit = url.searchParams.get("limit")
        ? parseInt(url.searchParams.get("limit") as string)
        : undefined;

      const offset = url.searchParams.get("offset")
        ? parseInt(url.searchParams.get("offset") as string)
        : undefined;

      // Parse join configuration
      let join;
      const joinParam = url.searchParams.get("join");
      if (joinParam) {
        try {
          join = JSON.parse(joinParam);
        } catch (e) {
          return createResponse(
            { error: "Invalid join parameter format. Must be valid JSON." },
            400,
          );
        }
      }

      // Parse single result flag
      const single = url.searchParams.get("single") === "true";

      selectParams = {
        table,
        columns,
        where,
        order,
        limit,
        offset,
        join,
        single,
      };
    } else if (request.method === "POST") {
      try {
        selectParams = await request.json();
      } catch (e) {
        return createResponse({ error: "Invalid request body. Must be valid JSON." }, 400);
      }

      if (!selectParams.table) {
        return createResponse({ error: "Missing required parameter: table" }, 400);
      }
    } else {
      return createResponse({ error: "Method not allowed" }, 405);
    }

    // Security and permissions check
    const { isAuthorized, userId, error } = await applySecurityAndPermissions(
      request,
      env,
      selectParams.table,
      "select",
    );

    if (!isAuthorized || error) {
      return error || createResponse({ error: "Unauthorized" }, 401);
    }

    // Execute the query with Supabase
    const result = await executeSupabaseQuery(env, selectParams, userId);

    if (result.error) {
      return createResponse(
        {
          error: "Database error",
          message: result.error.message,
          details: result.error,
        },
        500,
      );
    }

    // Return success response
    return createResponse(
      {
        data: result.data,
        count: result.count,
        params: selectParams, // Include for debugging/transparency
      },
      200,
    );
  } catch (error) {
    console.error("Error in handleSelect:", error);
    return createResponse(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
}

/**
 * Handle INSERT operations
 */
async function handleInsert(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // Parse the request body
    let insertParams: InsertParams;
    try {
      insertParams = await request.json();
    } catch (e) {
      return createResponse({ error: "Invalid request body. Must be valid JSON." }, 400);
    }

    // Validate required parameters
    if (!insertParams.table) {
      return createResponse({ error: "Missing required parameter: table" }, 400);
    }

    if (!insertParams.data) {
      return createResponse({ error: "Missing required parameter: data" }, 400);
    }

    // Security and permissions check
    const { isAuthorized, userId, error } = await applySecurityAndPermissions(
      request,
      env,
      insertParams.table,
      "insert",
    );

    if (!isAuthorized || error) {
      return error || createResponse({ error: "Unauthorized" }, 401);
    }

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Apply owner-only fields if applicable
    const tablePermissions = TABLE_PERMISSIONS[insertParams.table] || {};

    // If this is an owner-only table, add the user_id field
    if (userId && tablePermissions.ownerOnly) {
      const ownerIdColumn = tablePermissions.ownerIdColumn || "user_id";

      if (Array.isArray(insertParams.data)) {
        // Add user_id to each record in the array
        insertParams.data = insertParams.data.map((record) => ({
          ...record,
          [ownerIdColumn]: userId,
        }));
      } else {
        // Add user_id to the single record
        insertParams.data = {
          ...insertParams.data,
          [ownerIdColumn]: userId,
        };
      }
    }

    // Check column permissions
    if (tablePermissions.allowedColumns) {
      const checkColumnPermissions = (data: Record<string, any>) => {
        const columns = Object.keys(data);
        const invalidColumns = columns.filter(
          (col) => !tablePermissions.allowedColumns?.includes(col),
        );

        if (invalidColumns.length > 0) {
          throw new Error(`Access to columns [${invalidColumns.join(", ")}] is restricted`);
        }
      };

      if (Array.isArray(insertParams.data)) {
        insertParams.data.forEach(checkColumnPermissions);
      } else {
        checkColumnPermissions(insertParams.data);
      }
    }

    // Perform the insert operation
    const { data, error: dbError } = await supabase
      .from(insertParams.table)
      .insert(insertParams.data)
      .select();

    // Handle database errors
    if (dbError) {
      console.error("Database error:", dbError);
      return createResponse(
        {
          error: "Database error",
          message: dbError.message,
          details: dbError,
        },
        500,
      );
    }

    // Return success response
    return createResponse(
      {
        data,
        params: { table: insertParams.table },
      },
      201,
    );
  } catch (error) {
    console.error("Error in handleInsert:", error);
    return createResponse(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
}

/**
 * Handle UPDATE operations
 */
async function handleUpdate(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // Parse the request body
    let updateParams: UpdateParams;
    try {
      updateParams = await request.json();
    } catch (e) {
      return createResponse({ error: "Invalid request body. Must be valid JSON." }, 400);
    }

    // Validate required parameters
    if (!updateParams.table) {
      return createResponse({ error: "Missing required parameter: table" }, 400);
    }

    if (!updateParams.data) {
      return createResponse({ error: "Missing required parameter: data" }, 400);
    }

    if (!updateParams.where || Object.keys(updateParams.where).length === 0) {
      return createResponse({ error: "Missing required parameter: where conditions" }, 400);
    }

    // Security and permissions check
    const { isAuthorized, userId, error } = await applySecurityAndPermissions(
      request,
      env,
      updateParams.table,
      "update",
    );

    if (!isAuthorized || error) {
      return error || createResponse({ error: "Unauthorized" }, 401);
    }

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Apply owner-only restrictions
    const tablePermissions = TABLE_PERMISSIONS[updateParams.table] || {};

    // Start building the query
    let builder = supabase.from(updateParams.table).update(updateParams.data);

    // Apply owner-only restrictions
    if (userId && tablePermissions.ownerOnly) {
      const ownerIdColumn = tablePermissions.ownerIdColumn || "user_id";

      if (tablePermissions.selfTable) {
        // For tables like "users" where the primary key is "id"
        builder = builder.eq("id", userId);
      } else if (ownerIdColumn === "special_friendship") {
        // Special case for friendships (user_id_1 OR user_id_2)
        builder = builder.or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);
      } else {
        // Normal case
        builder = builder.eq(ownerIdColumn, userId);
      }
    }

    // Check column permissions
    if (tablePermissions.allowedColumns) {
      const columns = Object.keys(updateParams.data);
      const invalidColumns = columns.filter(
        (col) => !tablePermissions.allowedColumns?.includes(col),
      );

      if (invalidColumns.length > 0) {
        return createResponse(
          {
            error: "Access to some columns is restricted",
            invalidColumns,
          },
          403,
        );
      }
    }

    // Apply where conditions from request
    Object.entries(updateParams.where).forEach(([key, value]) => {
      if (value === null) {
        builder = builder.is(key, null);
      } else {
        builder = builder.eq(key, value);
      }
    });

    // Perform the update operation
    const { data, error: dbError } = await builder.select();

    // Handle database errors
    if (dbError) {
      console.error("Database error:", dbError);
      return createResponse(
        {
          error: "Database error",
          message: dbError.message,
          details: dbError,
        },
        500,
      );
    }

    // Return success response
    return createResponse(
      {
        data,
        params: {
          table: updateParams.table,
          rowsAffected: data?.length || 0,
        },
      },
      200,
    );
  } catch (error) {
    console.error("Error in handleUpdate:", error);
    return createResponse(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
}

/**
 * Handle DELETE operations
 */
async function handleDelete(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // Parse the request body
    let deleteParams: DeleteParams;
    try {
      deleteParams = await request.json();
    } catch (e) {
      return createResponse({ error: "Invalid request body. Must be valid JSON." }, 400);
    }

    // Validate required parameters
    if (!deleteParams.table) {
      return createResponse({ error: "Missing required parameter: table" }, 400);
    }

    if (!deleteParams.where || Object.keys(deleteParams.where).length === 0) {
      return createResponse({ error: "Missing required parameter: where conditions" }, 400);
    }

    // Security and permissions check
    const { isAuthorized, userId, error } = await applySecurityAndPermissions(
      request,
      env,
      deleteParams.table,
      "delete",
    );

    if (!isAuthorized || error) {
      return error || createResponse({ error: "Unauthorized" }, 401);
    }

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Start building the query
    let builder = supabase.from(deleteParams.table).delete();

    // Apply owner-only restrictions
    const tablePermissions = TABLE_PERMISSIONS[deleteParams.table] || {};

    if (userId && tablePermissions.ownerOnly) {
      // Add user_id restriction to ensure users can only delete their own data
      const ownerIdColumn = tablePermissions.ownerIdColumn || "user_id";

      // Special case for friendship tables
      if (tablePermissions.ownerIdColumn === "special_friendship") {
        // Create OR condition filter
        builder = builder.or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);
      } else {
        // Standard case - add user_id constraint
        builder = builder.eq(ownerIdColumn, userId);
      }
    }

    // Apply where conditions from request
    Object.entries(deleteParams.where).forEach(([key, value]) => {
      if (value === null) {
        builder = builder.is(key, null);
      } else {
        builder = builder.eq(key, value);
      }
    });

    // Perform the delete operation
    const { data, error: dbError } = await builder.select();

    // Handle database errors
    if (dbError) {
      console.error("Database error:", dbError);
      return createResponse(
        {
          error: "Database error",
          message: dbError.message,
          details: dbError,
        },
        500,
      );
    }

    // Return success response
    return createResponse(
      {
        data,
        params: {
          table: deleteParams.table,
          rowsAffected: data?.length || 0,
        },
      },
      200,
    );
  } catch (error) {
    console.error("Error in handleDelete:", error);
    return createResponse(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
}

/**
 * Apply security middleware and permissions checks
 * @param request The HTTP request
 * @param env Environment variables
 * @param table Table being accessed
 * @param operation Operation type (select, insert, update, delete)
 */
async function applySecurityAndPermissions(
  request: Request,
  env: Env,
  table: string,
  operation: OperationType = "select",
): Promise<{ isAuthorized: boolean; userId?: string; error?: Response }> {
  // Check if the table is allowed
  if (!ALLOWED_TABLES.includes(table)) {
    return {
      isAuthorized: false,
      error: createResponse({ error: "Access to this table is not allowed" }, 403),
    };
  }

  // Get table permissions
  const tablePermissions = TABLE_PERMISSIONS[table] || {};

  // Check operation-specific permissions
  if (tablePermissions.operations) {
    if (!tablePermissions.operations.includes(operation)) {
      return {
        isAuthorized: false,
        error: createResponse(
          {
            error: `Operation '${operation}' is not allowed on table '${table}'`,
          },
          403,
        ),
      };
    }
  }

  // Determine if authentication is required
  const requireAuth =
    tablePermissions.ownerOnly ||
    !!tablePermissions.requiredRole ||
    tablePermissions.selfTable ||
    operation !== "select"; // Always require auth for non-select operations

  // Apply security middleware
  const securityResult = await securityMiddleware(request, env, {
    requireAuth,
    rateLimitByIp: true,
    customRateLimit: {
      maxRequests: table === "products" ? 100 : 30, // Higher limit for public tables
      windowMs: 60000, // 1 minute
    },
  });

  // If user is authenticated, check role-based permissions
  if (tablePermissions.requiredRole && securityResult.isAuthorized && securityResult.userId) {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", securityResult.userId)
      .eq("role", tablePermissions.requiredRole)
      .single();

    if (roleError || !roleData) {
      return {
        isAuthorized: false,
        error: createResponse({ error: "Insufficient privileges" }, 403),
      };
    }
  }

  return securityResult;
}

/**
 * Execute a SELECT query on Supabase
 */
async function executeSupabaseQuery(
  env: Env,
  params: SelectParams,
  userId?: string,
): Promise<{ data: any; error?: any; count?: number }> {
  try {
    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Get table permissions
    const tablePermissions = TABLE_PERMISSIONS[params.table] || {};

    // Start building the query
    const selectQuery = Array.isArray(params.columns)
      ? params.columns.join(", ")
      : params.columns || "*";

    let builder = supabase.from(params.table).select(selectQuery);

    // Apply column restrictions if specified
    if (tablePermissions.allowedColumns && Array.isArray(params.columns)) {
      // Check if requested columns are allowed
      const invalidColumns = params.columns.filter(
        (col) => col !== "*" && !tablePermissions.allowedColumns?.includes(col),
      );

      if (invalidColumns.length > 0) {
        return {
          data: null,
          error: {
            message: "Access to some columns is restricted",
            invalidColumns,
          },
        };
      }
    }

    // Handle user-specific access control
    if (userId) {
      if (!params.where) {
        params.where = {};
      }

      // Special case: Users table where the user's own ID is in the "id" field
      if (tablePermissions.selfTable) {
        params.where.id = userId;
      }
      // Special case: Friends table with user_id_1 or user_id_2
      else if (tablePermissions.ownerIdColumn === "special_friendship") {
        // Use the filter syntax for OR conditions
        builder = builder.or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);
      }
      // Standard case: owner-only tables use user_id column by default
      else if (tablePermissions.ownerOnly) {
        const ownerIdColumn = tablePermissions.ownerIdColumn || "user_id";
        params.where[ownerIdColumn] = userId;
      }
    }

    // Apply forced conditions from permissions
    if (tablePermissions.forceConditions) {
      if (!params.where) {
        params.where = {};
      }

      // Merge forced conditions with user conditions
      params.where = { ...params.where, ...tablePermissions.forceConditions };
    }

    // Apply where conditions
    if (params.where) {
      // Skip applying conditions that are handled by special cases above
      const skipKeys =
        tablePermissions.ownerIdColumn === "special_friendship" ? ["user_id_1", "user_id_2"] : [];

      Object.entries(params.where).forEach(([key, value]) => {
        if (!skipKeys.includes(key)) {
          if (value === null) {
            builder = builder.is(key, null);
          } else if (Array.isArray(value)) {
            builder = builder.in(key, value);
          } else {
            builder = builder.eq(key, value);
          }
        }
      });
    }

    // Apply join if specified
    if (params.join && params.join.length > 0) {
      // This is a simplified approach - a more complete implementation would
      // handle different join types and complex joins
      const joinColumns = params.join[0].columns?.join(",") || "*";
      const foreignTable = params.join[0].table;
      builder = supabase.from(params.table).select(`*, ${foreignTable}(${joinColumns})`);
    }

    // Apply order by
    if (params.order) {
      builder = builder.order(params.order.column, {
        ascending: params.order.ascending !== false,
      });
    }

    // Apply limit
    if (params.limit !== undefined) {
      builder = builder.limit(params.limit);
    }

    // Apply offset
    if (params.offset !== undefined) {
      builder = builder.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    // Execute the query
    let result;
    if (params.single) {
      result = await builder.single();
      return { data: result.data, error: result.error, count: result.data ? 1 : 0 };
    } else {
      result = await builder;
      return { data: result.data, error: result.error, count: result.count ?? undefined };
    }
  } catch (error) {
    console.error("Error executing query:", error);
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
