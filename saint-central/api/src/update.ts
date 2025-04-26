import { createClient } from "@supabase/supabase-js";
import { Env } from "./index";
import { securityMiddleware, createResponse } from "./security";
import { ALLOWED_TABLES, TABLE_PERMISSIONS } from "./tableConfig";

interface UpdateParams {
  table: string; // Table to update
  data: Record<string, any>; // Data to update
  where?: Record<string, any>; // Where conditions
  returning?: string | string[]; // Columns to return after update
  single?: boolean; // Update a single record only
}

/**
 * Universal update API that can update any allowed table with permissions
 */
export async function handleUpdate(request: Request, env: Env): Promise<Response> {
  try {
    // Updates must be done via POST
    if (request.method !== "POST") {
      return createResponse({ error: "Method not allowed. Use POST for updates." }, 405);
    }

    // Parse update parameters from request body
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

    if (!updateParams.data || Object.keys(updateParams.data).length === 0) {
      return createResponse({ error: "Missing or empty required parameter: data" }, 400);
    }

    // Check if the table is allowed
    if (!ALLOWED_TABLES.includes(updateParams.table)) {
      return createResponse({ error: "Access to this table is not allowed" }, 403);
    }

    // Get table permissions
    const tablePermissions = TABLE_PERMISSIONS[updateParams.table] || {};

    // Check if update is allowed for this table
    if (tablePermissions.allowUpdate === false) {
      return createResponse({ error: "Updates are not allowed for this table" }, 403);
    }

    // Most update operations require authentication
    const requireAuth = true;

    // Apply security middleware with appropriate settings
    const { isAuthorized, userId, error } = await securityMiddleware(request, env, {
      requireAuth,
      rateLimitByIp: true,
      customRateLimit: {
        maxRequests: 20, // Lower limit for update operations
        windowMs: 60000, // 1 minute
      },
    });

    // Return error from security middleware if any
    if (!isAuthorized || error) {
      return error || createResponse({ error: "Unauthorized" }, 401);
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Check for role-based permission if required
    if (tablePermissions.requiredRole && userId) {
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", tablePermissions.requiredRole)
        .single();

      if (roleError || !roleData) {
        return createResponse({ error: "Insufficient privileges" }, 403);
      }
    }

    // Filter out any disallowed columns from update data
    if (tablePermissions.allowedColumns) {
      const disallowedColumns = Object.keys(updateParams.data).filter(
        (col) => !tablePermissions.allowedColumns?.includes(col),
      );

      if (disallowedColumns.length > 0) {
        return createResponse(
          {
            error: "Cannot update restricted columns",
            disallowedColumns,
          },
          403,
        );
      }
    }

    // Initialize where conditions if not provided
    const whereConditions = updateParams.where ? { ...updateParams.where } : {};

    // Handle user-specific access control
    if (userId) {
      // Special case: Users table where the user's own ID is in the "id" field
      if (tablePermissions.selfTable) {
        whereConditions.id = userId;
      }
      // Standard case: owner-only tables use user_id column by default
      else if (
        tablePermissions.ownerOnly &&
        tablePermissions.ownerIdColumn !== "special_friendship"
      ) {
        const ownerIdColumn = tablePermissions.ownerIdColumn || "user_id";
        whereConditions[ownerIdColumn] = userId;
      }
    }

    // Different approach based on the table type
    let result;

    // Special handling for friendship tables
    if (tablePermissions.ownerIdColumn === "special_friendship") {
      // For friendship relations, we need two separate queries
      const query1Promise = executeUpdate(
        supabase,
        updateParams.table,
        updateParams.data,
        { ...whereConditions, user_id_1: userId },
        updateParams.returning,
        updateParams.single,
      );

      const query2Promise = executeUpdate(
        supabase,
        updateParams.table,
        updateParams.data,
        { ...whereConditions, user_id_2: userId },
        updateParams.returning,
        updateParams.single,
      );

      // Execute both queries in parallel
      const [result1, result2] = await Promise.all([query1Promise, query2Promise]);

      // Combine results
      const data = [];
      const errors = [];

      if (result1.data) data.push(...(Array.isArray(result1.data) ? result1.data : [result1.data]));
      if (result2.data) data.push(...(Array.isArray(result2.data) ? result2.data : [result2.data]));
      if (result1.error) errors.push(result1.error);
      if (result2.error) errors.push(result2.error);

      // Create combined result
      result = {
        data: updateParams.single && data.length > 0 ? data[0] : data,
        error: errors.length > 0 ? errors[0] : null,
        count: data.length,
      };
    } else {
      // For normal tables, perform a standard update
      result = await executeUpdate(
        supabase,
        updateParams.table,
        updateParams.data,
        whereConditions,
        updateParams.returning,
        updateParams.single,
      );
    }

    // Handle database errors
    if (result.error) {
      console.error("Database error:", result.error);
      return createResponse(
        {
          error: "Database error",
          message: result.error.message,
          details: result.error,
        },
        500,
      );
    }

    // Return response with updated data
    return createResponse(
      {
        success: true,
        data: result.data,
        count:
          result.count || (result.data ? (Array.isArray(result.data) ? result.data.length : 1) : 0),
        updatedAt: new Date().toISOString(),
        params: {
          table: updateParams.table,
          where: whereConditions,
          returning: updateParams.returning,
          single: updateParams.single,
        },
      },
      200,
    );
  } catch (error) {
    // Handle unexpected errors
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
 * Helper function to execute a Supabase update query
 */
async function executeUpdate(
  supabase: any,
  table: string,
  data: Record<string, any>,
  whereConditions: Record<string, any>,
  returning?: string | string[],
  single?: boolean,
): Promise<{ data: any; error: any; count?: number }> {
  // Start with the basic query
  let query = supabase.from(table).update(data);

  // Apply where conditions
  Object.entries(whereConditions).forEach(([key, value]) => {
    query = query.eq(key, value);
  });

  // Add returning clause if specified
  if (returning) {
    if (Array.isArray(returning)) {
      query = query.select(returning.join(","));
    } else {
      query = query.select(returning);
    }
  }

  // Execute the query
  if (single) {
    return await query.single();
  } else {
    return await query;
  }
}
