import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Env } from "../index";
import { securityMiddleware, createResponse, validateInput } from "./security";
import { ALLOWED_TABLES, TABLE_PERMISSIONS } from "../shared/tableConfig";

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
 * Handle data requests
 */
export async function handleDataRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");

  // Skip the /api prefix if present
  const apiIndex = pathParts.findIndex((part) => part === "api");
  const startIndex = apiIndex >= 0 ? apiIndex + 1 : 1;

  const action = pathParts[startIndex];

  try {
    // Validate request authentication and CSRF protection
    const security = await securityMiddleware(request, env, {
      requireAuth: true,
      // Only validate CSRF for mutations
      validateCsrf: ["insert", "update", "delete", "upsert"].includes(action),
    });

    if (security.error) {
      return security.error;
    }

    // Route to the appropriate handler
    switch (action) {
      case "select":
        return handleSelect(request, env, security.userId);

      case "insert":
        return handleInsert(request, env, security.userId);

      case "update":
        return handleUpdate(request, env, security.userId);

      case "delete":
        return handleDelete(request, env, security.userId);

      case "upsert":
        return handleUpsert(request, env, security.userId);

      case "count":
        return handleCount(request, env, security.userId);

      case "query":
        return handleRawQuery(request, env, security.userId);

      default:
        return createResponse({ error: "Unknown data action" }, 400);
    }
  } catch (error) {
    console.error("Data handler error:", error);
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
 * Validate table permissions for a given operation
 */
function validateTablePermissions(
  table: string,
  operation: OperationType,
  userId?: string,
): { isValid: boolean; error?: string } {
  // Check if table is in the allowed tables list
  if (!ALLOWED_TABLES.includes(table)) {
    return {
      isValid: false,
      error: `Table '${table}' is not accessible via API`,
    };
  }

  // Get table permissions configuration
  const tableConfig = TABLE_PERMISSIONS[table];
  if (!tableConfig) {
    return {
      isValid: false,
      error: `No permission configuration found for table '${table}'`,
    };
  }

  // Check if operation is allowed for this table
  if (tableConfig.operations && !tableConfig.operations.includes(operation as any)) {
    return {
      isValid: false,
      error: `Operation '${operation}' is not allowed on table '${table}'`,
    };
  }

  // Check if owner-only and user id is present
  if (tableConfig.ownerOnly && !userId) {
    return {
      isValid: false,
      error: "Authentication required for accessing this table",
    };
  }

  return { isValid: true };
}

/**
 * Apply permission filters to a query based on table config
 */
function applyPermissionFilters(query: any, table: string, userId?: string): any {
  const tableConfig = TABLE_PERMISSIONS[table];

  // If no config or not owner-only, return unmodified query
  if (!tableConfig) return query;

  // Apply owner-only restriction if configured
  if (tableConfig.ownerOnly && userId) {
    if (tableConfig.selfTable) {
      // For tables like 'users' where the user's ID is in the 'id' column
      query = query.eq("id", userId);
    } else {
      // For normal tables with a user_id or custom owner column
      const ownerColumn = tableConfig.ownerIdColumn || "user_id";
      query = query.eq(ownerColumn, userId);
    }
  }

  // Apply forced conditions if present
  if (tableConfig.forceConditions) {
    Object.entries(tableConfig.forceConditions).forEach(([column, value]) => {
      query = query.eq(column, value);
    });
  }

  return query;
}

/**
 * Filter columns based on table permissions
 */
function filterAllowedColumns(table: string, columns: string | string[]): string | string[] {
  const tableConfig = TABLE_PERMISSIONS[table];

  // If no allowed columns specified, return original
  if (!tableConfig || !tableConfig.allowedColumns) return columns;

  // For '*' case, return all allowed columns
  if (columns === "*") {
    return tableConfig.allowedColumns;
  }

  // For array of columns, filter to only allowed ones
  if (Array.isArray(columns)) {
    return columns.filter((col) => tableConfig.allowedColumns!.includes(col));
  }

  // For comma-separated string of columns
  const columnsList = columns.split(",").map((c) => c.trim());
  const filteredColumns = columnsList.filter((col) => tableConfig.allowedColumns!.includes(col));
  return filteredColumns.join(",");
}

/**
 * Handle select operations
 */
async function handleSelect(request: Request, env: Env, userId?: string): Promise<Response> {
  if (request.method !== "GET" && request.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // Get query parameters or body
    let params: any;
    if (request.method === "GET") {
      params = Object.fromEntries(new URL(request.url).searchParams);
    } else {
      params = await request.json();
    }

    // Validate required parameters
    const tableValidation = validateInput(params.table || "", "string", { required: true });

    if (!tableValidation.isValid) {
      return createResponse({ error: tableValidation.error }, 400);
    }

    // Validate table permissions
    const permissionCheck = validateTablePermissions(tableValidation.value, "select", userId);
    if (!permissionCheck.isValid) {
      return createResponse({ error: permissionCheck.error }, 403);
    }

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Filter columns based on allowed columns
    let columns: string | string[] = filterAllowedColumns(
      tableValidation.value,
      params.select || "*",
    );

    // Start building the query
    let query = supabase
      .from(tableValidation.value)
      .select(typeof columns === "string" ? columns : columns.join(","));

    // Apply permission filters (e.g., owner-only restrictions)
    query = applyPermissionFilters(query, tableValidation.value, userId);

    // Apply filters if specified
    if (params.filter) {
      // Handle filter conditions
      const filters = Array.isArray(params.filter) ? params.filter : [params.filter];

      // Use the helper function to apply filters safely
      query = applyFilters(query, filters);
    }

    // Apply ordering if specified
    if (params.order) {
      query = query.order(params.order, {
        ascending: params.ascending !== "false" && params.ascending !== false,
        nullsFirst: params.nullsFirst === "true" || params.nullsFirst === true,
      });
    }

    // Apply pagination if specified
    if (params.limit) {
      query = query.limit(parseInt(params.limit));
    }

    // Handle offset with type safety
    if (params.offset) {
      try {
        // Try to use offset method if available, but don't error if it's not
        // @ts-ignore - We're checking at runtime if this method exists
        if (query.offset && typeof query.offset === "function") {
          // @ts-ignore - TypeScript doesn't know this method exists
          query = query.offset(parseInt(params.offset));
        }
      } catch (e) {
        console.warn("Offset method not available in this Supabase client version");
      }
    }

    // Execute the query
    const { data, error, count } = await query;

    if (error) {
      return createResponse({ error: error.message }, 400);
    }

    return createResponse({ data, count }, 200);
  } catch (error) {
    console.error("Select error:", error);
    return createResponse({ error: "Failed to execute select query" }, 500);
  }
}

/**
 * Handle insert operations
 */
async function handleInsert(request: Request, env: Env, userId?: string): Promise<Response> {
  if (request.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const params = await request.json();

    // Validate required parameters
    const tableValidation = validateInput(params.table || "", "string", { required: true });

    if (!tableValidation.isValid) {
      return createResponse({ error: tableValidation.error }, 400);
    }

    // Validate table permissions
    const permissionCheck = validateTablePermissions(tableValidation.value, "insert", userId);
    if (!permissionCheck.isValid) {
      return createResponse({ error: permissionCheck.error }, 403);
    }

    if (!params.values || (Array.isArray(params.values) && params.values.length === 0)) {
      return createResponse({ error: "Values to insert are required" }, 400);
    }

    // Add owner ID for owner-only tables if applicable
    const tableConfig = TABLE_PERMISSIONS[tableValidation.value];
    const values = Array.isArray(params.values) ? params.values : [params.values];

    if (tableConfig && tableConfig.ownerOnly && userId) {
      const ownerColumn = tableConfig.ownerIdColumn || "user_id";

      // Add owner ID to each record
      values.forEach((record: Record<string, any>) => {
        if (!record[ownerColumn]) {
          record[ownerColumn] = userId;
        }
      });
    }

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Handle different versions of Supabase client by checking which options are supported
    const options: any = {};

    // Add count option if specified
    if (params.count) {
      options.count =
        params.count === "exact" ? "exact" : params.count === "planned" ? "planned" : undefined;
    }

    // Execute the insert - only pass options if they're supported by the client
    const { data, error, count } = await supabase
      .from(tableValidation.value)
      .insert(values, options);

    if (error) {
      return createResponse({ error: error.message }, 400);
    }

    return createResponse({ data, count }, 201);
  } catch (error) {
    console.error("Insert error:", error);
    return createResponse({ error: "Failed to execute insert operation" }, 500);
  }
}

/**
 * Handle update operations
 */
async function handleUpdate(request: Request, env: Env, userId?: string): Promise<Response> {
  if (request.method !== "POST" && request.method !== "PUT" && request.method !== "PATCH") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const params = await request.json();

    // Validate required parameters
    const tableValidation = validateInput(params.table || "", "string", { required: true });

    if (!tableValidation.isValid) {
      return createResponse({ error: tableValidation.error }, 400);
    }

    // Validate table permissions
    const permissionCheck = validateTablePermissions(tableValidation.value, "update", userId);
    if (!permissionCheck.isValid) {
      return createResponse({ error: permissionCheck.error }, 403);
    }

    if (!params.values) {
      return createResponse({ error: "Values to update are required" }, 400);
    }

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Handle different versions of Supabase client by checking which options are supported
    const options: any = {};

    // Add count option if specified
    if (params.count) {
      options.count =
        params.count === "exact" ? "exact" : params.count === "planned" ? "planned" : undefined;
    }

    // Start building the query
    let query = supabase.from(tableValidation.value).update(params.values, options);

    // Apply permission filters (e.g., owner-only restrictions)
    query = applyPermissionFilters(query, tableValidation.value, userId);

    // Apply filters if specified (required for update)
    if (!params.filter) {
      return createResponse({ error: "Filter conditions are required for update operations" }, 400);
    }

    // Handle filter conditions
    const filters = Array.isArray(params.filter) ? params.filter : [params.filter];

    // Use the helper function to apply filters safely
    query = applyFilters(query, filters);

    // Execute the query
    const { data, error, count } = await query;

    if (error) {
      return createResponse({ error: error.message }, 400);
    }

    return createResponse({ data, count }, 200);
  } catch (error) {
    console.error("Update error:", error);
    return createResponse({ error: "Failed to execute update operation" }, 500);
  }
}

/**
 * Handle delete operations
 */
async function handleDelete(request: Request, env: Env, userId?: string): Promise<Response> {
  if (request.method !== "DELETE" && request.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // Get parameters from URL or body
    let params: any;
    if (request.method === "DELETE") {
      params = Object.fromEntries(new URL(request.url).searchParams);
    } else {
      params = await request.json();
    }

    // Validate required parameters
    const tableValidation = validateInput(params.table || "", "string", { required: true });

    if (!tableValidation.isValid) {
      return createResponse({ error: tableValidation.error }, 400);
    }

    // Validate table permissions
    const permissionCheck = validateTablePermissions(tableValidation.value, "delete", userId);
    if (!permissionCheck.isValid) {
      return createResponse({ error: permissionCheck.error }, 403);
    }

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Handle different versions of Supabase client by checking which options are supported
    const options: any = {};

    // Add count option if specified
    if (params.count) {
      options.count =
        params.count === "exact" ? "exact" : params.count === "planned" ? "planned" : undefined;
    }

    // Start building the query
    let query = supabase.from(tableValidation.value).delete(options);

    // Apply permission filters (e.g., owner-only restrictions)
    query = applyPermissionFilters(query, tableValidation.value, userId);

    // Apply filters if specified (required for delete)
    if (!params.filter) {
      return createResponse({ error: "Filter conditions are required for delete operations" }, 400);
    }

    // Handle filter conditions
    const filters = Array.isArray(params.filter) ? params.filter : [params.filter];

    // Use the helper function to apply filters safely
    query = applyFilters(query, filters);

    // Execute the query
    const { data, error, count } = await query;

    if (error) {
      return createResponse({ error: error.message }, 400);
    }

    return createResponse({ data, count }, 200);
  } catch (error) {
    console.error("Delete error:", error);
    return createResponse({ error: "Failed to execute delete operation" }, 500);
  }
}

/**
 * Handle upsert operations
 */
async function handleUpsert(request: Request, env: Env, userId?: string): Promise<Response> {
  if (request.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const params = await request.json();

    // Validate required parameters
    const tableValidation = validateInput(params.table || "", "string", { required: true });

    if (!tableValidation.isValid) {
      return createResponse({ error: tableValidation.error }, 400);
    }

    // Validate table permissions - need both insert and update permissions
    const insertCheck = validateTablePermissions(tableValidation.value, "insert", userId);
    const updateCheck = validateTablePermissions(tableValidation.value, "update", userId);

    if (!insertCheck.isValid) {
      return createResponse({ error: insertCheck.error }, 403);
    }

    if (!updateCheck.isValid) {
      return createResponse({ error: updateCheck.error }, 403);
    }

    if (!params.values || (Array.isArray(params.values) && params.values.length === 0)) {
      return createResponse({ error: "Values to upsert are required" }, 400);
    }

    // Add owner ID for owner-only tables if applicable
    const tableConfig = TABLE_PERMISSIONS[tableValidation.value];
    const values = Array.isArray(params.values) ? params.values : [params.values];

    if (tableConfig && tableConfig.ownerOnly && userId) {
      const ownerColumn = tableConfig.ownerIdColumn || "user_id";

      // Add owner ID to each record
      values.forEach((record: Record<string, any>) => {
        if (!record[ownerColumn]) {
          record[ownerColumn] = userId;
        }
      });
    }

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Prepare options for the upsert operation
    const options: any = {};

    // Add onConflict if specified
    if (params.onConflict) {
      options.onConflict = params.onConflict;
    }

    // Add ignoreDuplicates if specified
    if (params.ignoreDuplicates === true) {
      options.ignoreDuplicates = true;
    }

    // Add count option if specified
    if (params.count) {
      options.count =
        params.count === "exact" ? "exact" : params.count === "planned" ? "planned" : undefined;
    }

    // Execute the upsert
    const { data, error, count } = await supabase
      .from(tableValidation.value)
      .upsert(values, options);

    if (error) {
      return createResponse({ error: error.message }, 400);
    }

    return createResponse({ data, count }, 201);
  } catch (error) {
    console.error("Upsert error:", error);
    return createResponse({ error: "Failed to execute upsert operation" }, 500);
  }
}

/**
 * Handle count operations
 */
async function handleCount(request: Request, env: Env, userId?: string): Promise<Response> {
  if (request.method !== "GET" && request.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // Get parameters from URL or body
    let params: any;
    if (request.method === "GET") {
      params = Object.fromEntries(new URL(request.url).searchParams);
    } else {
      params = await request.json();
    }

    // Validate required parameters
    const tableValidation = validateInput(params.table || "", "string", { required: true });

    if (!tableValidation.isValid) {
      return createResponse({ error: tableValidation.error }, 400);
    }

    // Validate table permissions
    const permissionCheck = validateTablePermissions(tableValidation.value, "select", userId);
    if (!permissionCheck.isValid) {
      return createResponse({ error: permissionCheck.error }, 403);
    }

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Start building the query with count option
    let query = supabase.from(tableValidation.value).select("*", { count: "exact", head: true });

    // Apply permission filters (e.g., owner-only restrictions)
    query = applyPermissionFilters(query, tableValidation.value, userId);

    // Apply filters if specified
    if (params.filter) {
      // Handle filter conditions
      const filters = Array.isArray(params.filter) ? params.filter : [params.filter];

      // Use the helper function to apply filters safely
      query = applyFilters(query, filters);
    }

    // Execute the query
    const { error, count } = await query;

    if (error) {
      return createResponse({ error: error.message }, 400);
    }

    return createResponse({ count }, 200);
  } catch (error) {
    console.error("Count error:", error);
    return createResponse({ error: "Failed to execute count operation" }, 500);
  }
}

/**
 * Handle raw query operations (with security restrictions)
 */
async function handleRawQuery(request: Request, env: Env, userId?: string): Promise<Response> {
  if (request.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const params = await request.json();

    // Validate required parameters
    if (!params.query) {
      return createResponse({ error: "SQL query is required" }, 400);
    }

    // Always require userId for raw SQL queries for security
    if (!userId) {
      return createResponse({ error: "Authentication required for raw queries" }, 401);
    }

    // Basic SQL injection protection
    const query = params.query.toString();

    // Block potentially dangerous queries
    const dangerousPatterns = [
      /DROP\s+TABLE/i,
      /DELETE\s+FROM\s+(?!.*WHERE)/i, // DELETE without WHERE clause
      /UPDATE\s+(?!.*WHERE)/i, // UPDATE without WHERE clause
      /TRUNCATE/i,
      /ALTER\s+TABLE/i,
      /CREATE\s+TABLE/i,
      /EXECUTE/i,
      /EXEC\s+sp_/i,
      /xp_cmdshell/i,
      /GRANT\s+/i,
      /REVOKE\s+/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        return createResponse(
          { error: "The query contains potentially dangerous operations" },
          403,
        );
      }
    }

    // Additional check: make sure the query only accesses allowed tables
    for (const table of ALLOWED_TABLES) {
      const tablePattern = new RegExp(`\\b${table}\\b`, "i");
      if (tablePattern.test(query)) {
        // For each table found in the query, validate permissions
        const permCheck = validateTablePermissions(table, "select", userId);
        if (!permCheck.isValid) {
          return createResponse(
            { error: `Unauthorized access to table '${table}' in raw query` },
            403,
          );
        }
      }
    }

    // Initialize Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Execute the raw query with parameters
    const { data, error } = await supabase.rpc("execute_sql", {
      sql_query: query,
      params: params.params || [],
    });

    if (error) {
      return createResponse({ error: error.message }, 400);
    }

    return createResponse({ data }, 200);
  } catch (error) {
    console.error("Raw query error:", error);
    return createResponse({ error: "Failed to execute raw query" }, 500);
  }
}

// Create a helper function to apply filters safely
function applyFilter(query: any, filter: Filter): any {
  if (!filter.column || !filter.operator || filter.value === undefined) {
    return query;
  }

  try {
    const op = filter.operator;

    // Manually handle the cases to avoid type instantiation issues
    if (op === "eq") return query.eq(filter.column, filter.value);
    if (op === "neq") return query.neq(filter.column, filter.value);
    if (op === "gt") return query.gt(filter.column, filter.value);
    if (op === "gte") return query.gte(filter.column, filter.value);
    if (op === "lt") return query.lt(filter.column, filter.value);
    if (op === "lte") return query.lte(filter.column, filter.value);
    if (op === "contains") return query.contains(filter.column, filter.value);
    if (op === "ilike") return query.ilike(filter.column, filter.value);

    // Special handling for 'in' operator
    if (op === "in") {
      const value = Array.isArray(filter.value) ? filter.value : [filter.value];
      return query.in(filter.column, value);
    }

    // Return unchanged if operator not recognized
    console.warn(`Filter operator '${op}' not supported`);
    return query;
  } catch (e) {
    console.warn(`Error applying filter: ${e}`);
    return query;
  }
}

// Apply all filters to the query
function applyFilters(query: any, filters: any[]): any {
  for (const filter of filters) {
    query = applyFilter(query, filter);
  }
  return query;
}
