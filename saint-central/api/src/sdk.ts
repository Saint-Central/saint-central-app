/**
 * SaintCentral SDK - A TypeScript client for interacting with the SaintCentral API
 * Inspired by the Supabase client library with added security features
 */

// Filter Types
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
  | "match";

interface Filter {
  column: string;
  operator: FilterOperator;
  value: any;
}

// Join Types
type JoinType = "inner" | "left" | "right" | "full";

interface JoinConfig {
  type: JoinType;
  table: string;
  on: { foreignKey: string; primaryKey: string };
  columns?: string[];
}

// Response and Parameter interfaces
interface SaintCentralResponse<T = any> {
  data: T | null;
  count?: number;
  params?: any;
  error: Error | null;
  status: number;
}

interface Error {
  message: string;
  details?: any;
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

interface ClientOptions {
  baseUrl?: string;
  headers?: Record<string, string>;
  autoRefreshToken?: boolean;
  persistSession?: boolean;
  detectSessionInUrl?: boolean;
}

interface TransactionOptions {
  isolationLevel?: "serializable" | "repeatable read" | "read committed" | "read uncommitted";
}

// Main SDK Class
class SaintCentral<T = any> {
  private baseUrl: string;
  private headers: Record<string, string>;
  private autoRefreshToken: boolean;
  private persistSession: boolean;
  private detectSessionInUrl: boolean;

  // Query builder state
  private _table: string | null = null;
  private _columns: string | string[] = "*";
  private _filters: Filter[] = [];
  private _whereConditions: Record<string, any> = {};
  private _orderBy: OrderParams[] = [];
  private _limitVal: number | null = null;
  private _offsetVal: number | null = null;
  private _range: RangeParams | null = null;
  private _joins: JoinConfig[] = [];
  private _singleResult: boolean = false;
  private _countOption: boolean = false;
  private _transactionId: string | null = null;

  constructor(baseUrl: string = "", options: ClientOptions = {}) {
    this.baseUrl = baseUrl || "https://saint-central-api.colinmcherney.workers.dev";
    this.headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };
    this.autoRefreshToken = options.autoRefreshToken ?? true;
    this.persistSession = options.persistSession ?? true;
    this.detectSessionInUrl = options.detectSessionInUrl ?? true;
    this._reset();
  }

  /**
   * Set authentication token for this instance
   */
  auth(token: string): SaintCentral<T> {
    if (token) {
      this.headers["Authorization"] = `Bearer ${token}`;
    }
    return this;
  }

  /**
   * Create a new instance with auth from a Supabase session or token
   */
  withAuth(session: any): SaintCentral<T> {
    const copy = new SaintCentral<T>(this.baseUrl, {
      headers: { ...this.headers },
      autoRefreshToken: this.autoRefreshToken,
      persistSession: this.persistSession,
      detectSessionInUrl: this.detectSessionInUrl,
    });

    if (session) {
      // Extract token from Supabase session object
      const token =
        typeof session === "string"
          ? session // Handle case when a direct token is passed
          : session.access_token || session.data?.session?.access_token; // Handle Supabase session object

      if (token) {
        copy.headers["Authorization"] = `Bearer ${token}`;
      }
    }

    return copy;
  }

  /**
   * Create a new instance without any auth token
   */
  withoutAuth(): SaintCentral<T> {
    const copy = new SaintCentral<T>(this.baseUrl, {
      headers: { ...this.headers },
      autoRefreshToken: this.autoRefreshToken,
      persistSession: this.persistSession,
      detectSessionInUrl: this.detectSessionInUrl,
    });
    delete copy.headers["Authorization"];
    return copy;
  }

  /**
   * Reset query builder
   */
  private _reset(): SaintCentral<T> {
    this._table = null;
    this._columns = "*";
    this._whereConditions = {};
    this._filters = [];
    this._orderBy = [];
    this._limitVal = null;
    this._offsetVal = null;
    this._range = null;
    this._joins = [];
    this._singleResult = false;
    this._countOption = false;
    return this;
  }

  /**
   * Start a query from a table
   */
  from<TableResult = any>(table: string): SaintCentral<TableResult> {
    this._reset();
    this._table = table;
    return this as unknown as SaintCentral<TableResult>;
  }

  /**
   * Parse a select string to identify joins in Supabase format (table(field1, field2))
   * @private
   */
  private _parseSelectString(selectStr: string): {
    mainColumns: string[];
    joins: Array<{ table: string; columns: string[] }>;
  } {
    const result = {
      mainColumns: [] as string[],
      joins: [] as Array<{ table: string; columns: string[] }>,
    };

    let currentPos = 0;
    let currentToken = "";
    let parenthesesLevel = 0;
    let inParentheses = false;
    let currentJoinTable = "";

    // Helper to add a column to the appropriate list
    const addColumn = (col: string) => {
      if (col.trim() === "") return;

      if (!inParentheses) {
        result.mainColumns.push(col.trim());
      } else if (currentJoinTable) {
        // We're inside a join table's column list
        const join = result.joins.find((j) => j.table === currentJoinTable);
        if (join) {
          join.columns.push(col.trim());
        }
      }
    };

    while (currentPos < selectStr.length) {
      const char = selectStr[currentPos];

      if (char === "(") {
        if (parenthesesLevel === 0) {
          // Starting a join table's column list
          inParentheses = true;
          currentJoinTable = currentToken.trim();
          result.joins.push({ table: currentJoinTable, columns: [] });
          currentToken = "";
        } else {
          // Nested parentheses, add to current token
          currentToken += char;
        }
        parenthesesLevel++;
      } else if (char === ")") {
        parenthesesLevel--;
        if (parenthesesLevel === 0) {
          // Ending a join table's column list
          inParentheses = false;
          currentJoinTable = "";
        } else {
          // Nested parentheses, add to current token
          currentToken += char;
        }
      } else if (char === "," && parenthesesLevel === 0) {
        // Column separator at top level
        addColumn(currentToken);
        currentToken = "";
      } else if (char === "," && inParentheses) {
        // Column separator inside a join
        addColumn(currentToken);
        currentToken = "";
      } else {
        currentToken += char;
      }

      currentPos++;
    }

    // Add the last token if there is one
    if (currentToken.trim()) {
      addColumn(currentToken);
    }

    return result;
  }

  /**
   * Select columns
   */
  select<SelectResult = T>(columnsOrTable: string | string[] = "*"): SaintCentral<SelectResult> {
    if (!this._table && typeof columnsOrTable === "string") {
      this._table = columnsOrTable;
      this._columns = "*";
      return this as unknown as SaintCentral<SelectResult>;
    }

    // Handle the standard array case
    if (Array.isArray(columnsOrTable)) {
      this._columns = columnsOrTable;
      return this as unknown as SaintCentral<SelectResult>;
    }

    // Handle the star case
    if (columnsOrTable === "*") {
      this._columns = "*";
      return this as unknown as SaintCentral<SelectResult>;
    }

    // Parse the string for Supabase-style joins
    const parsed = this._parseSelectString(columnsOrTable);

    // Set the main columns
    this._columns = parsed.mainColumns.length > 0 ? parsed.mainColumns : "*";

    // Set up joins for each join table found
    parsed.joins.forEach((join) => {
      // For Supabase compatibility, we'll assume joins are based on foreign keys
      // using the format: '{foreignTable}_id'
      const foreignKey = `${join.table}_id`;
      const primaryKey = "id"; // Common primary key name

      this._joins.push({
        type: "inner", // Default to inner join
        table: join.table,
        on: {
          foreignKey: foreignKey,
          primaryKey: primaryKey,
        },
        columns: join.columns,
      });
    });

    return this as unknown as SaintCentral<SelectResult>;
  }

  // ----- FILTERING METHODS ----- //

  /**
   * Add equality filter condition (column = value)
   */
  eq(column: string, value: any): SaintCentral<T> {
    this._filters.push({ column, operator: "eq", value });
    this._whereConditions[column] = value; // For backward compatibility
    return this;
  }

  /**
   * Add inequality filter condition (column != value)
   */
  neq(column: string, value: any): SaintCentral<T> {
    this._filters.push({ column, operator: "neq", value });
    return this;
  }

  /**
   * Add greater than filter condition (column > value)
   */
  gt(column: string, value: any): SaintCentral<T> {
    this._filters.push({ column, operator: "gt", value });
    return this;
  }

  /**
   * Add greater than or equal filter condition (column >= value)
   */
  gte(column: string, value: any): SaintCentral<T> {
    this._filters.push({ column, operator: "gte", value });
    return this;
  }

  /**
   * Add less than filter condition (column < value)
   */
  lt(column: string, value: any): SaintCentral<T> {
    this._filters.push({ column, operator: "lt", value });
    return this;
  }

  /**
   * Add less than or equal filter condition (column <= value)
   */
  lte(column: string, value: any): SaintCentral<T> {
    this._filters.push({ column, operator: "lte", value });
    return this;
  }

  /**
   * Add LIKE filter condition (column LIKE value)
   */
  like(column: string, value: string): SaintCentral<T> {
    this._filters.push({ column, operator: "like", value });
    return this;
  }

  /**
   * Add ILIKE filter condition (column ILIKE value)
   */
  ilike(column: string, value: string): SaintCentral<T> {
    this._filters.push({ column, operator: "ilike", value });
    return this;
  }

  /**
   * Add IS filter condition (column IS value)
   * Typically used for NULL checks
   */
  is(column: string, value: null | boolean): SaintCentral<T> {
    this._filters.push({ column, operator: "is", value });
    if (value === null) {
      this._whereConditions[column] = null; // For backward compatibility
    }
    return this;
  }

  /**
   * Add IN filter condition (column IN (values))
   */
  in(column: string, values: any[]): SaintCentral<T> {
    this._filters.push({ column, operator: "in", value: values });
    return this;
  }

  /**
   * Add array contains filter (column @> [values])
   */
  contains(column: string, values: any[]): SaintCentral<T> {
    this._filters.push({ column, operator: "contains", value: values });
    return this;
  }

  /**
   * Add array contained by filter (column <@ [values])
   */
  containedBy(column: string, values: any[]): SaintCentral<T> {
    this._filters.push({ column, operator: "containedBy", value: values });
    return this;
  }

  /**
   * Add overlaps filter (column && [values])
   */
  overlaps(column: string, values: any[]): SaintCentral<T> {
    this._filters.push({ column, operator: "overlaps", value: values });
    return this;
  }

  /**
   * Add text search filter
   */
  textSearch(column: string, query: string, options?: { config?: string }): SaintCentral<T> {
    this._filters.push({
      column,
      operator: "textSearch",
      value: { query, ...options },
    });
    return this;
  }

  /**
   * Add a match filter for jsonb columns
   */
  match(column: string, value: Record<string, any>): SaintCentral<T> {
    this._filters.push({ column, operator: "match", value });
    return this;
  }

  /**
   * Add a direct filter
   */
  filter(column: string, operator: FilterOperator, value: any): SaintCentral<T> {
    this._filters.push({ column, operator, value });
    return this;
  }

  /**
   * Add where conditions (legacy method)
   */
  where(columnOrConditions: string | Record<string, any>, value?: any): SaintCentral<T> {
    if (typeof columnOrConditions === "object") {
      this._whereConditions = { ...this._whereConditions, ...columnOrConditions };
      // Convert to filters
      Object.entries(columnOrConditions).forEach(([col, val]) => {
        this._filters.push({ column: col, operator: "eq", value: val });
      });
    } else if (typeof columnOrConditions === "string" && value !== undefined) {
      this._whereConditions[columnOrConditions] = value;
      this._filters.push({ column: columnOrConditions, operator: "eq", value });
    }
    return this;
  }

  /**
   * Add an OR filter (Supabase compatible)
   */
  or(filters: string, options?: { foreignTable?: string }): SaintCentral<T> {
    // Add as a special filter that will be processed by the backend
    this._filters.push({
      column: "or",
      operator: "eq",
      value: { filters, foreignTable: options?.foreignTable },
    });
    return this;
  }

  /**
   * Add an AND filter (Supabase compatible)
   */
  and(filters: string, options?: { foreignTable?: string }): SaintCentral<T> {
    // Add as a special filter that will be processed by the backend
    this._filters.push({
      column: "and",
      operator: "eq",
      value: { filters, foreignTable: options?.foreignTable },
    });
    return this;
  }

  /**
   * Add a NOT filter (Supabase compatible)
   */
  not(column: string, operator: FilterOperator, value: any): SaintCentral<T> {
    this._filters.push({
      column: "not",
      operator: "eq",
      value: { column, operator, value },
    });
    return this;
  }

  // ----- ORDER, PAGINATION & RANGE METHODS ----- //

  /**
   * Order results
   */
  order(
    column: string,
    options: { ascending?: boolean; nullsFirst?: boolean } = {},
  ): SaintCentral<T> {
    this._orderBy.push({
      column,
      ascending: options.ascending !== false,
      nullsFirst: options.nullsFirst,
    });
    return this;
  }

  /**
   * Order ascending (Supabase compatible)
   */
  orderBy(column: string, options: { nullsFirst?: boolean } = {}): SaintCentral<T> {
    return this.order(column, { ascending: true, nullsFirst: options.nullsFirst });
  }

  /**
   * Order descending (Supabase compatible)
   */
  orderByDesc(column: string, options: { nullsFirst?: boolean } = {}): SaintCentral<T> {
    return this.order(column, { ascending: false, nullsFirst: options.nullsFirst });
  }

  /**
   * Limit results
   */
  limit(value: number): SaintCentral<T> {
    this._limitVal = value;
    return this;
  }

  /**
   * Offset results
   */
  offset(value: number): SaintCentral<T> {
    this._offsetVal = value;
    return this;
  }

  /**
   * Set range for pagination (similar to Supabase's range method)
   */
  range(from: number, to: number): SaintCentral<T> {
    this._range = { from, to };
    return this;
  }

  // ----- JOIN METHODS ----- //

  /**
   * Join another table
   */
  join(
    table: string,
    config: { foreignKey: string; primaryKey: string; columns?: string[] },
  ): SaintCentral<T> {
    this._joins.push({
      type: "inner",
      table,
      on: {
        foreignKey: config.foreignKey,
        primaryKey: config.primaryKey,
      },
      columns: config.columns,
    });
    return this;
  }

  /**
   * Left join another table
   */
  leftJoin(
    table: string,
    config: { foreignKey: string; primaryKey: string; columns?: string[] },
  ): SaintCentral<T> {
    this._joins.push({
      type: "left",
      table,
      on: {
        foreignKey: config.foreignKey,
        primaryKey: config.primaryKey,
      },
      columns: config.columns,
    });
    return this;
  }

  /**
   * Right join another table
   */
  rightJoin(
    table: string,
    config: { foreignKey: string; primaryKey: string; columns?: string[] },
  ): SaintCentral<T> {
    this._joins.push({
      type: "right",
      table,
      on: {
        foreignKey: config.foreignKey,
        primaryKey: config.primaryKey,
      },
      columns: config.columns,
    });
    return this;
  }

  /**
   * Full outer join another table (Supabase compatible)
   */
  fullOuterJoin(
    table: string,
    config: { foreignKey: string; primaryKey: string; columns?: string[] },
  ): SaintCentral<T> {
    this._joins.push({
      type: "full",
      table,
      on: {
        foreignKey: config.foreignKey,
        primaryKey: config.primaryKey,
      },
      columns: config.columns,
    });
    return this;
  }

  // ----- RESULT MODIFIERS ----- //

  /**
   * Return only a single result
   */
  single<SingleResult = T>(): SaintCentral<SingleResult> {
    this._singleResult = true;
    return this as unknown as SaintCentral<SingleResult>;
  }

  /**
   * Get first result (Supabase compatible)
   */
  maybeSingle<SingleResult = T>(): Promise<SaintCentralResponse<SingleResult | null>> {
    this._singleResult = true;
    return this.execute<SingleResult | null>();
  }

  /**
   * Get count of results (without fetching data)
   */
  count(): Promise<number> {
    this._countOption = true;
    return this.execute<{ count: number }>().then((response) => response.count || 0);
  }

  /**
   * Start a transaction
   */
  async begin(options?: TransactionOptions): Promise<SaintCentral<T>> {
    const trx = new SaintCentral<T>(this.baseUrl, {
      headers: { ...this.headers },
      autoRefreshToken: this.autoRefreshToken,
      persistSession: this.persistSession,
      detectSessionInUrl: this.detectSessionInUrl,
    });

    try {
      // Start transaction
      const result = await trx._request<{ transactionId: string }>(
        `${this.baseUrl}/api/transaction/start`,
        "POST",
        {},
      );
      if (result.error) {
        throw new Error(result.error.message);
      }

      // Set transaction ID in headers
      const transactionId = result.data?.transactionId;
      if (!transactionId) {
        throw new Error("Failed to get transaction ID");
      }

      trx.headers["X-Transaction-Id"] = transactionId;
      trx._transactionId = transactionId;

      return trx;
    } catch (error) {
      console.error("Error starting transaction:", error);
      throw error;
    }
  }

  /**
   * Commit a transaction
   */
  async commit(): Promise<SaintCentralResponse<null>> {
    if (!this._transactionId) {
      throw new Error("No active transaction to commit");
    }

    try {
      const result = await this._request<null>(`${this.baseUrl}/api/transaction/commit`, "POST");
      this._transactionId = null;
      return result;
    } catch (error) {
      console.error("Error committing transaction:", error);
      throw error;
    }
  }

  /**
   * Rollback a transaction
   */
  async rollback(): Promise<SaintCentralResponse<null>> {
    if (!this._transactionId) {
      throw new Error("No active transaction to rollback");
    }

    try {
      const result = await this._request<null>(`${this.baseUrl}/api/transaction/rollback`, "POST");
      this._transactionId = null;
      return result;
    } catch (error) {
      console.error("Error rolling back transaction:", error);
      throw error;
    }
  }

  /**
   * Execute a function with a transaction
   */
  async transaction<R>(callback: (trx: SaintCentral<T>) => Promise<R>): Promise<R> {
    const trx = await this.begin();

    try {
      // Execute callback with transaction client
      const result = await callback(trx);

      // Commit transaction
      await trx.commit();

      return result;
    } catch (error) {
      // Rollback transaction on error
      await trx.rollback();
      throw error;
    }
  }

  // ----- EXECUTION METHODS ----- //

  /**
   * Execute SELECT query (GET)
   */
  async get<GetResult = T>(): Promise<SaintCentralResponse<GetResult>> {
    if (!this._table) {
      throw new Error("No table specified");
    }

    const params = new URLSearchParams();
    params.append("table", this._table);

    if (this._columns !== "*") {
      params.append(
        "columns",
        Array.isArray(this._columns) ? this._columns.join(",") : this._columns,
      );
    }

    // Handle legacy where conditions
    if (Object.keys(this._whereConditions).length > 0) {
      params.append("where", JSON.stringify(this._whereConditions));
    }

    // Handle advanced filters
    if (this._filters.length > 0) {
      params.append("filters", JSON.stringify(this._filters));
    }

    // Handle order by with first order param for backward compatibility
    if (this._orderBy.length > 0) {
      params.append("order", JSON.stringify(this._orderBy[0]));

      // If multiple order params, include them all
      if (this._orderBy.length > 1) {
        params.append("orderBy", JSON.stringify(this._orderBy));
      }
    }

    if (this._limitVal !== null) {
      params.append("limit", this._limitVal.toString());
    }

    if (this._offsetVal !== null) {
      params.append("offset", this._offsetVal.toString());
    }

    // Handle range as an alternative to limit/offset
    if (this._range !== null) {
      params.append("range", JSON.stringify(this._range));
    }

    if (this._joins.length > 0) {
      params.append("join", JSON.stringify(this._joins));
    }

    if (this._singleResult) {
      params.append("single", "true");
    }

    if (this._countOption) {
      params.append("count", "true");
    }

    const url = `${this.baseUrl}/api/select?${params.toString()}`;
    return this._request<GetResult>(url, "GET");
  }

  /**
   * Execute SELECT query (POST)
   */
  async execute<ExecResult = T>(): Promise<SaintCentralResponse<ExecResult>> {
    return this.get<ExecResult>();
  }

  /**
   * Insert data
   */
  async insert<InsertResult = T>(
    tableOrData: string | Record<string, any> | Record<string, any>[],
    data?: Record<string, any> | Record<string, any>[],
    options?: { returning?: boolean | "minimal" | "representation" | string[] },
  ): Promise<SaintCentralResponse<InsertResult>> {
    let table: string;
    let insertData: Record<string, any> | Record<string, any>[];

    if (typeof tableOrData === "string") {
      table = tableOrData;
      insertData = data as Record<string, any> | Record<string, any>[];
    } else {
      if (!this._table) {
        throw new Error("No table specified. Call from() first or provide table name to insert()");
      }
      table = this._table;
      insertData = tableOrData;
    }

    this._reset();
    const url = `${this.baseUrl}/api/insert`;
    return this._request<InsertResult>(url, "POST", { table, data: insertData });
  }

  /**
   * Upsert data (insert with on conflict do update)
   */
  async upsert<UpsertResult = T>(
    tableOrData: string | Record<string, any> | Record<string, any>[],
    data?: Record<string, any> | Record<string, any>[],
    options: {
      onConflict?: string | string[];
      returning?: boolean | "minimal" | "representation" | string[];
    } = {},
  ): Promise<SaintCentralResponse<UpsertResult>> {
    let table: string;
    let upsertData: Record<string, any> | Record<string, any>[];

    if (typeof tableOrData === "string") {
      table = tableOrData;
      upsertData = data as Record<string, any> | Record<string, any>[];
    } else {
      if (!this._table) {
        throw new Error("No table specified. Call from() first or provide table name to upsert()");
      }
      table = this._table;
      upsertData = tableOrData;
    }

    // Convert onConflict string to array if needed
    const onConflict =
      typeof options.onConflict === "string" ? [options.onConflict] : options.onConflict;

    this._reset();
    const url = `${this.baseUrl}/api/upsert`;
    return this._request<UpsertResult>(url, "POST", {
      table,
      data: upsertData,
      onConflict,
    });
  }

  /**
   * Update data
   */
  async update<UpdateResult = T>(
    tableOrData: string | Record<string, any>,
    dataOrConditions?: Record<string, any>,
    conditions?: Record<string, any>,
  ): Promise<SaintCentralResponse<UpdateResult>> {
    let table: string;
    let updateData: Record<string, any>;
    let whereConditions: Record<string, any>;

    if (typeof tableOrData === "string") {
      // Using the signature: update(table, data, conditions)
      table = tableOrData;
      updateData = dataOrConditions as Record<string, any>;
      whereConditions = conditions as Record<string, any>;
    } else {
      // Using the signature: from(table).update(data)
      if (!this._table) {
        throw new Error("No table specified. Call from() first or provide table name to update()");
      }
      table = this._table;
      updateData = tableOrData;
      whereConditions = this._whereConditions;

      // Also include advanced filters
      if (this._filters.length > 0) {
        whereConditions = {
          ...whereConditions,
          _filters: this._filters,
        };
      }
    }

    // Additional validation
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new Error("No data specified for update");
    }

    if (!whereConditions || Object.keys(whereConditions).length === 0) {
      throw new Error("No conditions specified for update. This would update all rows.");
    }

    const payload = { table, data: updateData, where: whereConditions };
    this._reset();
    const url = `${this.baseUrl}/api/update`;
    return this._request<UpdateResult>(url, "POST", payload);
  }

  /**
   * Delete data
   */
  async delete<DeleteResult = T>(
    tableOrConditions?: string | Record<string, any>,
    conditions?: Record<string, any>,
  ): Promise<SaintCentralResponse<DeleteResult>> {
    let table: string;
    let whereConditions: Record<string, any>;

    if (typeof tableOrConditions === "string") {
      // Using the signature: delete(table, conditions)
      table = tableOrConditions;
      whereConditions = conditions as Record<string, any>;
    } else if (tableOrConditions && typeof tableOrConditions === "object") {
      // Using the signature: from(table).delete(conditions)
      if (!this._table) {
        throw new Error("No table specified. Call from() first or provide table name to delete()");
      }
      table = this._table;
      whereConditions = tableOrConditions;
    } else {
      // Using the signature: from(table).where(...).delete()
      if (!this._table) {
        throw new Error("No table specified");
      }
      table = this._table;
      whereConditions = this._whereConditions;

      // Also include advanced filters
      if (this._filters.length > 0) {
        whereConditions = {
          ...whereConditions,
          filters: this._filters,
        };
      }
    }

    // Safety check to prevent deleting all rows
    if (!whereConditions || Object.keys(whereConditions).length === 0) {
      throw new Error("No conditions specified for delete. This would delete all rows.");
    }

    this._reset();
    const url = `${this.baseUrl}/api/delete`;
    return this._request<DeleteResult>(url, "POST", { table, where: whereConditions });
  }

  /**
   * Internal request method
   */
  private async _request<R>(
    url: string,
    method: "GET" | "POST",
    body?: Record<string, any>,
  ): Promise<SaintCentralResponse<R>> {
    try {
      const response = await fetch(url, {
        method,
        headers: this.headers,
        body: method === "POST" && body ? JSON.stringify(body) : undefined,
      });

      const contentType = response.headers.get("content-type");
      const isJson = contentType?.includes("application/json");

      let result: any;
      if (isJson) {
        result = await response.json();
      } else {
        const text = await response.text();
        result = { data: text };
      }

      if (!response.ok) {
        console.error(
          `[SaintCentral] Request failed (${response.status}):`,
          result.error || "Unknown error",
        );

        return {
          data: null,
          error: {
            message: result.error || result.message || "Unknown error",
            details: result.details || result,
          },
          status: response.status,
        };
      }

      return {
        data: result.data,
        count: result.count,
        params: result.params,
        error: null,
        status: response.status,
      };
    } catch (error) {
      console.error("[SaintCentral] Request failed:", error);
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          details: error,
        },
        status: 500,
      };
    } finally {
      this._reset();
    }
  }
}

/**
 * Create a new client with options
 */
export function createClient(baseUrl?: string, options?: ClientOptions): SaintCentral {
  return new SaintCentral(baseUrl, options);
}

// Create a singleton instance for easy usage
const saintcentral = createClient("https://saint-central-api.colinmcherney.workers.dev");

export default saintcentral;
export { SaintCentral };

// Type exports
export type {
  SaintCentralResponse,
  OrderParams,
  FilterOperator,
  Filter,
  JoinType,
  JoinConfig,
  RangeParams,
  ClientOptions,
  TransactionOptions,
  Error,
};
