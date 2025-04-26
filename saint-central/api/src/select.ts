import { createClient } from "@supabase/supabase-js";
import { Env } from "./index";
import { securityMiddleware, createResponse } from "./security";
import { ALLOWED_TABLES, TABLE_PERMISSIONS } from "./tableConfig";

interface SelectParams {
  table: string; // Table to select from
  columns: string | string[]; // Columns to select
  where?: Record<string, any>; // Where conditions
  order?: { column: string; ascending?: boolean }; // Order by
  limit?: number; // Limit results
  offset?: number; // Offset results
  join?: {
    // Join configuration
    table: string;
    on: { foreignKey: string; primaryKey: string };
    columns?: string[];
  }[];
  single?: boolean; // Return single result
}

/**
 * Universal select API that can query any allowed table with permissions
 */
export async function handleSelect(request: Request, env: Env): Promise<Response> {
  try {
    // For GET requests, parameters will be in the URL
    // For POST requests, parameters will be in the request body
    let selectParams: SelectParams;

    if (request.method === "GET") {
      const url = new URL(request.url);
      const table = url.searchParams.get("table");

      if (!table) {
        return createResponse({ error: "Missing required parameter: table" }, 400);
      }

      const columns = url.searchParams.get("columns") || "*";

      // Parse where conditions if provided
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

      // Parse other parameters
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

      const limit = url.searchParams.get("limit")
        ? parseInt(url.searchParams.get("limit") as string)
        : undefined;
      const offset = url.searchParams.get("offset")
        ? parseInt(url.searchParams.get("offset") as string)
        : undefined;

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

      const single = url.searchParams.get("single") === "true";

      selectParams = {
        table,
        columns: columns.split(",").map((col) => col.trim()),
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

    // Check if the table is allowed
    if (!ALLOWED_TABLES.includes(selectParams.table)) {
      return createResponse({ error: "Access to this table is not allowed" }, 403);
    }

    // Get table permissions
    const tablePermissions = TABLE_PERMISSIONS[selectParams.table] || {};

    // Determine if authentication is required
    const requireAuth =
      tablePermissions.ownerOnly || !!tablePermissions.requiredRole || tablePermissions.selfTable;

    // Apply security middleware with appropriate settings
    const { isAuthorized, userId, error, clientIp } = await securityMiddleware(request, env, {
      requireAuth,
      rateLimitByIp: true,
      customRateLimit: {
        maxRequests: selectParams.table === "products" ? 100 : 30, // Higher limit for public tables
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

    // Start building the query
    let query = supabase
      .from(selectParams.table)
      .select(
        Array.isArray(selectParams.columns)
          ? selectParams.columns.join(", ")
          : selectParams.columns,
      );

    // Apply column restrictions if specified
    if (tablePermissions.allowedColumns && Array.isArray(selectParams.columns)) {
      // Check if requested columns are allowed
      const invalidColumns = selectParams.columns.filter(
        (col) => col !== "*" && !tablePermissions.allowedColumns?.includes(col),
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

    // Handle user-specific access control
    if (userId) {
      if (!selectParams.where) {
        selectParams.where = {};
      }

      // Special case: Users table where the user's own ID is in the "id" field
      if (tablePermissions.selfTable) {
        selectParams.where.id = userId;
      }
      // Special case: Friends table with user_id_1 or user_id_2
      else if (tablePermissions.ownerIdColumn === "special_friendship") {
        query = query.or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);
      }
      // Standard case: owner-only tables use user_id column by default
      else if (tablePermissions.ownerOnly) {
        const ownerIdColumn = tablePermissions.ownerIdColumn || "user_id";
        selectParams.where[ownerIdColumn] = userId;
      }
    }

    // Apply forced conditions from permissions
    if (tablePermissions.forceConditions) {
      if (!selectParams.where) {
        selectParams.where = {};
      }

      // Merge forced conditions with user conditions
      selectParams.where = { ...selectParams.where, ...tablePermissions.forceConditions };
    }

    // Apply where conditions
    if (selectParams.where) {
      // Skip applying conditions that are handled by special cases above
      const skipKeys =
        tablePermissions.ownerIdColumn === "special_friendship" ? ["user_id_1", "user_id_2"] : [];

      Object.entries(selectParams.where).forEach(([key, value]) => {
        if (!skipKeys.includes(key)) {
          query = query.eq(key, value);
        }
      });
    }

    // Apply order by
    if (selectParams.order) {
      query = query.order(selectParams.order.column, {
        ascending: selectParams.order.ascending !== false,
      });
    }

    // Apply limit
    if (selectParams.limit !== undefined) {
      query = query.limit(selectParams.limit);
    }

    // Apply offset
    if (selectParams.offset !== undefined) {
      query = query.range(
        selectParams.offset,
        selectParams.offset + (selectParams.limit || 10) - 1,
      );
    }

    // Execute the query
    const {
      data,
      error: dbError,
      count,
    } = selectParams.single ? await query.single() : await query;

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

    // Return response with the data
    return createResponse(
      {
        data,
        count,
        params: selectParams, // Include the parameters for debugging/transparency
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
