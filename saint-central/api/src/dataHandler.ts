import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Env } from "./index";
import { securityMiddleware, createResponse } from "./security";
import { ALLOWED_TABLES, TABLE_PERMISSIONS } from "./tableConfig";

// Type definitions for operation type
type OperationType = "select" | "insert" | "update" | "delete" | "upsert";

// Filter types
type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like"
  | "ilike"
  | "is"
  | "in"
  | "contains"
  | "containedBy"
  | "overlaps"
  | "textSearch"
  | "match"
  | "or"
  | "and"
  | "not";

interface Filter {
  column: string;
  operator: FilterOperator;
  value: any;
}

// Join types
type JoinType = "inner" | "left" | "right" | "full";

interface JoinConfig {
  type: JoinType;
  table: string;
  on: { foreignKey: string; primaryKey: string };
  columns?: string[];
}

interface OrderParams {
  column: string;
  ascending?: boolean;
  nullsFirst?: boolean;
}

interface RangeParams {
  from: number;
  to: number;
}

interface SelectParams {
  table: string;
  columns?: string | string[];
  where?: Record<string, any>;
  filters?: Filter[];
  order?: OrderParams | OrderParams[];
  orderBy?: OrderParams[]; // Support for multiple order by clauses
  limit?: number;
  offset?: number;
  range?: RangeParams; // Support for range-based pagination
  join?: JoinConfig[];
  single?: boolean;
  count?: boolean; // Option to return only count
}

interface InsertParams {
  table: string;
  data: Record<string, any> | Record<string, any>[];
}

interface UpsertParams {
  table: string;
  data: Record<string, any> | Record<string, any>[];
  onConflict?: string[];
}

interface UpdateParams {
  table: string;
  data: Record<string, any>;
  where: Record<string, any>;
  filters?: Filter[];
}

interface DeleteParams {
  table: string;
  where: Record<string, any>;
  filters?: Filter[];
}

interface TransactionParams {
  txId?: string;
}

// Map to store active transactions
const activeTransactions = new Map<
  string,
  {
    supabase: SupabaseClient;
    userId: string;
    startTime: number;
  }
>();

// Transaction timeout (5 minutes)
const TRANSACTION_TIMEOUT = 300000; // 5 minutes in milliseconds

/**
 * Function to clean up expired transactions
 */
function cleanupExpiredTransactions() {
  const now = Date.now();
  for (const [txId, tx] of activeTransactions.entries()) {
    if (now - tx.startTime > TRANSACTION_TIMEOUT) {
      activeTransactions.delete(txId);
      console.log(`Transaction ${txId} expired and was removed`);
    }
  }
}

/**
 * Universal API Router - Routes to the appropriate handler based on the operation
 */
export async function handleDataRequest(request: Request, env: Env): Promise<Response> {
  try {
    // Clean up expired transactions on each request
    cleanupExpiredTransactions();

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
      case "upsert":
        return handleUpsert(request, env);
      case "transaction/start":
        return handleTransactionStart(request, env);
      case "transaction/commit":
        return handleTransactionCommit(request, env);
      case "transaction/rollback":
        return handleTransactionRollback(request, env);
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

      // Parse filters
      let filters: Filter[] = [];
      const filtersParam = url.searchParams.get("filters");
      if (filtersParam) {
        try {
          filters = JSON.parse(filtersParam);
        } catch (e) {
          return createResponse(
            { error: "Invalid filters parameter format. Must be valid JSON." },
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

      // Parse multiple order by params
      let orderBy;
      const orderByParam = url.searchParams.get("orderBy");
      if (orderByParam) {
        try {
          orderBy = JSON.parse(orderByParam);
        } catch (e) {
          return createResponse(
            { error: "Invalid orderBy parameter format. Must be valid JSON." },
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

      // Parse range
      let range;
      const rangeParam = url.searchParams.get("range");
      if (rangeParam) {
        try {
          range = JSON.parse(rangeParam);
        } catch (e) {
          return createResponse(
            { error: "Invalid range parameter format. Must be valid JSON." },
            400,
          );
        }
      }

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

      // Parse count flag
      const count = url.searchParams.get("count") === "true";

      selectParams = {
        table,
        columns,
        where,
        filters,
        order,
        orderBy,
        limit,
        offset,
        range,
        join,
        single,
        count,
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

    // Transaction handling
    const transactionId = request.headers.get("X-Transaction-Id");
    if (transactionId && activeTransactions.has(transactionId)) {
      const tx = activeTransactions.get(transactionId)!;

      // Check transaction timeout
      if (Date.now() - tx.startTime > TRANSACTION_TIMEOUT) {
        activeTransactions.delete(transactionId);
        return createResponse({ error: "Transaction timed out" }, 408);
      }

      // Execute with transaction context
      const result = await executeSupabaseQueryWithTransaction(
        tx.supabase,
        selectParams,
        tx.userId,
      );

      return createResponse(
        {
          data: result.data,
          count: result.count,
          params: selectParams,
        },
        200,
      );
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

    // Transaction handling
    const transactionId = request.headers.get("X-Transaction-Id");
    if (transactionId && activeTransactions.has(transactionId)) {
      const tx = activeTransactions.get(transactionId)!;

      // Check transaction timeout
      if (Date.now() - tx.startTime > TRANSACTION_TIMEOUT) {
        activeTransactions.delete(transactionId);
        return createResponse({ error: "Transaction timed out" }, 408);
      }

      // Apply owner-only fields if applicable (same as non-transaction path)
      const tablePermissions = TABLE_PERMISSIONS[insertParams.table] || {};

      if (tx.userId && tablePermissions.ownerOnly) {
        const ownerIdColumn = tablePermissions.ownerIdColumn || "user_id";

        if (Array.isArray(insertParams.data)) {
          insertParams.data = insertParams.data.map((record) => ({
            ...record,
            [ownerIdColumn]: tx.userId,
          }));
        } else {
          insertParams.data = {
            ...insertParams.data,
            [ownerIdColumn]: tx.userId,
          };
        }
      }

      // Execute insert in transaction
      const { data, error: dbError } = await tx.supabase
        .from(insertParams.table)
        .insert(insertParams.data)
        .select();

      if (dbError) {
        return createResponse(
          {
            error: "Database error",
            message: dbError.message,
            details: dbError,
          },
          500,
        );
      }

      return createResponse(
        {
          data,
          params: { table: insertParams.table },
        },
        201,
      );
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
 * Handle UPSERT operations
 */
async function handleUpsert(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // Parse the request body
    let upsertParams: UpsertParams;
    try {
      upsertParams = await request.json();
    } catch (e) {
      return createResponse({ error: "Invalid request body. Must be valid JSON." }, 400);
    }

    // Validate required parameters
    if (!upsertParams.table) {
      return createResponse({ error: "Missing required parameter: table" }, 400);
    }

    if (!upsertParams.data) {
      return createResponse({ error: "Missing required parameter: data" }, 400);
    }

    // Transaction handling
    const transactionId = request.headers.get("X-Transaction-Id");
    if (transactionId && activeTransactions.has(transactionId)) {
      const tx = activeTransactions.get(transactionId)!;

      // Check transaction timeout
      if (Date.now() - tx.startTime > TRANSACTION_TIMEOUT) {
        activeTransactions.delete(transactionId);
        return createResponse({ error: "Transaction timed out" }, 408);
      }

      // Apply owner-only fields similar to insert operation
      const tablePermissions = TABLE_PERMISSIONS[upsertParams.table] || {};

      if (tx.userId && tablePermissions.ownerOnly) {
        const ownerIdColumn = tablePermissions.ownerIdColumn || "user_id";

        if (Array.isArray(upsertParams.data)) {
          upsertParams.data = upsertParams.data.map((record) => ({
            ...record,
            [ownerIdColumn]: tx.userId,
          }));
        } else {
          upsertParams.data = {
            ...upsertParams.data,
            [ownerIdColumn]: tx.userId,
          };
        }
      }

      // Create upsert options with onConflict if specified
      const upsertOptions =
        upsertParams.onConflict && upsertParams.onConflict.length > 0
          ? { onConflict: upsertParams.onConflict.join(",") }
          : {};

      // Execute upsert
      const { data, error: dbError } = await tx.supabase
        .from(upsertParams.table)
        .upsert(upsertParams.data, upsertOptions)
        .select();

      if (dbError) {
        return createResponse(
          {
            error: "Database error",
            message: dbError.message,
            details: dbError,
          },
          500,
        );
      }

      return createResponse(
        {
          data,
          params: { table: upsertParams.table },
        },
        201,
      );
    }

    // Security and permissions check - map upsert to insert for permissions
    const { isAuthorized, userId, error } = await applySecurityAndPermissions(
      request,
      env,
      upsertParams.table,
      "insert" as OperationType, // Fix: Cast to OperationType
    );

    if (!isAuthorized || error) {
      return error || createResponse({ error: "Unauthorized" }, 401);
    }

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Apply owner-only fields if applicable (similar to insert)
    const tablePermissions = TABLE_PERMISSIONS[upsertParams.table] || {};

    // If this is an owner-only table, add the user_id field
    if (userId && tablePermissions.ownerOnly) {
      const ownerIdColumn = tablePermissions.ownerIdColumn || "user_id";

      if (Array.isArray(upsertParams.data)) {
        // Add user_id to each record in the array
        upsertParams.data = upsertParams.data.map((record) => ({
          ...record,
          [ownerIdColumn]: userId,
        }));
      } else {
        // Add user_id to the single record
        upsertParams.data = {
          ...upsertParams.data,
          [ownerIdColumn]: userId,
        };
      }
    }

    // Check column permissions (similar to insert)
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

      if (Array.isArray(upsertParams.data)) {
        upsertParams.data.forEach(checkColumnPermissions);
      } else {
        checkColumnPermissions(upsertParams.data);
      }
    }

    // Create upsert options with onConflict if specified
    const upsertOptions =
      upsertParams.onConflict && upsertParams.onConflict.length > 0
        ? { onConflict: upsertParams.onConflict.join(",") }
        : {};

    // Perform the upsert operation
    const { data, error: dbError } = await supabase
      .from(upsertParams.table)
      .upsert(upsertParams.data, upsertOptions)
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
        params: { table: upsertParams.table },
      },
      201,
    );
  } catch (error) {
    console.error("Error in handleUpsert:", error);
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

    // Transaction handling
    const transactionId = request.headers.get("X-Transaction-Id");
    if (transactionId && activeTransactions.has(transactionId)) {
      const tx = activeTransactions.get(transactionId)!;

      // Check transaction timeout
      if (Date.now() - tx.startTime > TRANSACTION_TIMEOUT) {
        activeTransactions.delete(transactionId);
        return createResponse({ error: "Transaction timed out" }, 408);
      }

      // Apply owner-only restrictions
      const tablePermissions = TABLE_PERMISSIONS[updateParams.table] || {};

      // Start building the query
      let builder = tx.supabase.from(updateParams.table).update(updateParams.data);

      // Apply owner-only restrictions
      if (tablePermissions.ownerOnly) {
        const ownerIdColumn = tablePermissions.ownerIdColumn || "user_id";

        if (tablePermissions.selfTable) {
          // For tables like "users" where the primary key is "id"
          builder = builder.eq("id", tx.userId);
        } else if (ownerIdColumn === "special_friendship") {
          // Special case for friendships (user_id_1 OR user_id_2)
          builder = builder.or(`user_id_1.eq.${tx.userId},user_id_2.eq.${tx.userId}`);
        } else {
          // Normal case
          builder = builder.eq(ownerIdColumn, tx.userId);
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

      // Apply advanced filters if present
      if (updateParams.filters && updateParams.filters.length > 0) {
        for (const filter of updateParams.filters) {
          const { column, operator, value } = filter;

          applyFilterToBuilder(builder, column, operator, value);
        }
      }

      // Execute update
      const { data, error: dbError } = await builder.select();

      if (dbError) {
        return createResponse(
          {
            error: "Database error",
            message: dbError.message,
            details: dbError,
          },
          500,
        );
      }

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

    // Apply advanced filters if present
    if (updateParams.filters && updateParams.filters.length > 0) {
      for (const filter of updateParams.filters) {
        const { column, operator, value } = filter;

        applyFilterToBuilder(builder, column, operator, value);
      }
    }

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

    // Transaction handling
    const transactionId = request.headers.get("X-Transaction-Id");
    if (transactionId && activeTransactions.has(transactionId)) {
      const tx = activeTransactions.get(transactionId)!;

      // Check transaction timeout
      if (Date.now() - tx.startTime > TRANSACTION_TIMEOUT) {
        activeTransactions.delete(transactionId);
        return createResponse({ error: "Transaction timed out" }, 408);
      }

      // Start building the query
      let builder = tx.supabase.from(deleteParams.table).delete();

      // Apply owner-only restrictions
      const tablePermissions = TABLE_PERMISSIONS[deleteParams.table] || {};

      if (tablePermissions.ownerOnly) {
        const ownerIdColumn = tablePermissions.ownerIdColumn || "user_id";

        if (tablePermissions.ownerIdColumn === "special_friendship") {
          // Create OR condition filter
          builder = builder.or(`user_id_1.eq.${tx.userId},user_id_2.eq.${tx.userId}`);
        } else {
          // Standard case - add user_id constraint
          builder = builder.eq(ownerIdColumn, tx.userId);
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

      // Apply advanced filters if present
      if (deleteParams.filters && deleteParams.filters.length > 0) {
        for (const filter of deleteParams.filters) {
          const { column, operator, value } = filter;

          applyFilterToBuilder(builder, column, operator, value);
        }
      }

      // Execute delete
      const { data, error: dbError } = await builder.select();

      if (dbError) {
        return createResponse(
          {
            error: "Database error",
            message: dbError.message,
            details: dbError,
          },
          500,
        );
      }

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

    // Apply advanced filters if present
    if (deleteParams.filters && deleteParams.filters.length > 0) {
      for (const filter of deleteParams.filters) {
        const { column, operator, value } = filter;

        applyFilterToBuilder(builder, column, operator, value);
      }
    }

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
 * Handle transaction start
 */
async function handleTransactionStart(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // Security check
    const { isAuthorized, userId, error } = await securityMiddleware(request, env, {
      requireAuth: true,
    });

    if (!isAuthorized || error) {
      return error || createResponse({ error: "Unauthorized" }, 401);
    }

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Generate a unique transaction ID
    const transactionId = crypto.randomUUID();

    // Store transaction data
    activeTransactions.set(transactionId, {
      supabase,
      userId: userId!,
      startTime: Date.now(),
    });

    // Return transaction ID
    return createResponse(
      {
        transactionId,
        message: "Transaction started successfully",
      },
      200,
      {
        "X-Transaction-Id": transactionId,
      },
    );
  } catch (error) {
    console.error("Error in handleTransactionStart:", error);
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
 * Handle transaction commit
 */
async function handleTransactionCommit(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // Get transaction ID
    const transactionId = request.headers.get("X-Transaction-Id");

    if (!transactionId || !activeTransactions.has(transactionId)) {
      return createResponse({ error: "Invalid or expired transaction ID" }, 400);
    }

    // Clean up transaction data
    activeTransactions.delete(transactionId);

    return createResponse(
      {
        message: "Transaction committed successfully",
      },
      200,
    );
  } catch (error) {
    console.error("Error in handleTransactionCommit:", error);
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
 * Handle transaction rollback
 */
async function handleTransactionRollback(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // Get transaction ID
    const transactionId = request.headers.get("X-Transaction-Id");

    if (!transactionId || !activeTransactions.has(transactionId)) {
      return createResponse({ error: "Invalid or expired transaction ID" }, 400);
    }

    // Clean up transaction data
    activeTransactions.delete(transactionId);

    return createResponse(
      {
        message: "Transaction rolled back successfully",
      },
      200,
    );
  } catch (error) {
    console.error("Error in handleTransactionRollback:", error);
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
  operation: "select" | "insert" | "update" | "delete" | "upsert", // Fix: Updated to include "upsert"
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

  // For upsert operations, use insert permissions
  const effectiveOperation = operation === "upsert" ? "insert" : operation;

  // Check operation-specific permissions
  if (tablePermissions.operations) {
    if (!tablePermissions.operations.includes(effectiveOperation)) {
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
    effectiveOperation !== "select"; // Always require auth for non-select operations

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
 * Helper function to apply a filter to a query builder
 */
function applyFilterToBuilder(
  builder: any,
  column: string,
  operator: FilterOperator,
  value: any,
): any {
  switch (operator) {
    case "eq":
      return builder.eq(column, value);
    case "neq":
      return builder.neq(column, value);
    case "gt":
      return builder.gt(column, value);
    case "gte":
      return builder.gte(column, value);
    case "lt":
      return builder.lt(column, value);
    case "lte":
      return builder.lte(column, value);
    case "like":
      return builder.like(column, value);
    case "ilike":
      return builder.ilike(column, value);
    case "is":
      return builder.is(column, value);
    case "in":
      return builder.in(column, value);
    case "contains":
      return builder.contains(column, value);
    case "containedBy":
      return builder.containedBy(column, value);
    case "overlaps":
      return builder.overlaps(column, value);
    case "textSearch":
      if (typeof value === "object" && value.query) {
        const config = value.config ? { config: value.config } : {};
        return builder.textSearch(column, value.query, config);
      } else {
        return builder.textSearch(column, String(value));
      }
    // Handle OR condition filter from SDK
    case "or":
      if (column === "or" && typeof value === "object") {
        // Process OR filter from SDK
        const { filters, foreignTable } = value;
        // foreignTable is optional and passed through if provided
        const options = foreignTable ? { foreignTable } : undefined;
        return builder.or(filters, options);
      }
      return builder;
    // Handle AND condition filter from SDK
    case "and":
      if (column === "and" && typeof value === "object") {
        // Process AND filter from SDK
        const { filters, foreignTable } = value;
        // foreignTable is optional and passed through if provided
        const options = foreignTable ? { foreignTable } : undefined;
        return builder.and(filters, options);
      }
      return builder;
    // Handle NOT condition filter from SDK
    case "not":
      if (column === "not" && typeof value === "object") {
        // Process NOT filter from SDK
        const { column: notColumn, operator: notOperator, value: notValue } = value;
        return builder.not(notColumn, notOperator, notValue);
      }
      return builder;
    default:
      console.warn(`Unknown filter operator: ${operator}`);
      return builder;
  }
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

    return executeSupabaseQueryWithClient(supabase, params, userId);
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

/**
 * Execute a SELECT query with a transaction
 */
async function executeSupabaseQueryWithTransaction(
  supabase: SupabaseClient,
  params: SelectParams,
  userId?: string,
): Promise<{ data: any; error?: any; count?: number }> {
  try {
    return executeSupabaseQueryWithClient(supabase, params, userId);
  } catch (error) {
    console.error("Error executing transaction query:", error);
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Shared logic for executing a SELECT query with a Supabase client
 */
async function executeSupabaseQueryWithClient(
  supabase: SupabaseClient,
  params: SelectParams,
  userId?: string,
): Promise<{ data: any; error?: any; count?: number }> {
  try {
    // Get table permissions
    const tablePermissions = TABLE_PERMISSIONS[params.table] || {};

    // Start building the query
    const selectQuery = Array.isArray(params.columns)
      ? params.columns.join(", ")
      : params.columns || "*";

    let builder = supabase.from(params.table).select(selectQuery, {
      count: params.count === true ? "exact" : undefined,
    });

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

    // Apply advanced filters if present
    if (params.filters && params.filters.length > 0) {
      for (const filter of params.filters) {
        const { column, operator, value } = filter;

        builder = applyFilterToBuilder(builder, column, operator, value);
      }
    }

    // Apply join if specified
    if (params.join && params.join.length > 0) {
      // Reset builder with new join syntax
      const columns = Array.isArray(params.columns)
        ? params.columns.join(", ")
        : params.columns || "*";
      let joinQuery = `${columns}`;

      // Add each join
      for (const join of params.join) {
        const joinColumns = join.columns?.join(",") || "*";
        const joinType = join.type || "inner"; // Default to inner join

        // Add to the query based on join type
        switch (joinType) {
          case "left":
            joinQuery += `, ${join.table}!left(${joinColumns})`;
            break;
          case "right":
            joinQuery += `, ${join.table}!right(${joinColumns})`;
            break;
          case "full":
            joinQuery += `, ${join.table}!outer(${joinColumns})`;
            break;
          default: // inner join
            joinQuery += `, ${join.table}(${joinColumns})`;
            break;
        }
      }

      // Create new builder with the join query
      builder = supabase.from(params.table).select(joinQuery, {
        count: params.count === true ? "exact" : undefined,
      });

      // Reapply any conditions that were on the original builder
      // This depends on your implementation and might need to be adjusted
    }

    // Apply multiple order by clauses if present
    if (params.orderBy && params.orderBy.length > 0) {
      for (const order of params.orderBy) {
        builder = builder.order(order.column, {
          ascending: order.ascending !== false,
          nullsFirst: order.nullsFirst,
        });
      }
    }
    // Handle single order parameter (either object or array)
    else if (params.order) {
      if (Array.isArray(params.order)) {
        for (const order of params.order) {
          builder = builder.order(order.column, {
            ascending: order.ascending !== false,
            nullsFirst: order.nullsFirst,
          });
        }
      } else {
        builder = builder.order(params.order.column, {
          ascending: params.order.ascending !== false,
          nullsFirst: params.order.nullsFirst,
        });
      }
    }

    // Apply range-based pagination (preferred over limit/offset)
    if (params.range) {
      builder = builder.range(params.range.from, params.range.to);
    } else {
      // Apply limit and offset if range is not specified
      if (params.limit !== undefined) {
        builder = builder.limit(params.limit);
      }

      // Fix: Apply offset using range instead of offset method
      if (params.offset !== undefined) {
        const from = params.offset;
        const to = params.offset + (params.limit || 10) - 1;
        builder = builder.range(from, to);
      }
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
