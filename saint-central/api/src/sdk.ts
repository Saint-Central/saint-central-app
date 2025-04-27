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
  data: T;
  count?: number;
  params?: any;
  error?: string;
  message?: string;
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

// Main SDK Class
class SaintCentral<T = any> {
  private baseUrl: string;
  private headers: Record<string, string>;

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

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl || "https://saint-central-api.colinmcherney.workers.dev";
    this.headers = {
      "Content-Type": "application/json",
    };
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
    const copy = new SaintCentral<T>(this.baseUrl);
    copy.headers = { ...this.headers };

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
    const copy = new SaintCentral<T>(this.baseUrl);
    copy.headers = { ...this.headers };
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
   * Select columns
   */
  select<SelectResult = T>(columnsOrTable: string | string[] = "*"): SaintCentral<SelectResult> {
    if (!this._table && typeof columnsOrTable === "string") {
      this._table = columnsOrTable;
      this._columns = "*";
      return this as unknown as SaintCentral<SelectResult>;
    }

    if (Array.isArray(columnsOrTable)) {
      this._columns = columnsOrTable;
    } else if (typeof columnsOrTable === "string") {
      this._columns =
        columnsOrTable === "*" ? "*" : columnsOrTable.split(",").map((col) => col.trim());
    }
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

  // ----- RESULT MODIFIERS ----- //

  /**
   * Return only a single result
   */
  single<SingleResult = T>(): SaintCentral<SingleResult> {
    this._singleResult = true;
    return this as unknown as SaintCentral<SingleResult>;
  }

  /**
   * Get count of results (without fetching data)
   */
  count(): Promise<number> {
    this._countOption = true;
    return this.execute<{ count: number }>().then((response) => response.count || 0);
  }

  /**
   * Execute a function with a transaction
   */
  async transaction<R>(callback: (trx: SaintCentral<T>) => Promise<R>): Promise<R> {
    const trx = new SaintCentral<T>(this.baseUrl);
    trx.headers = { ...this.headers, "X-Transaction": "true" };

    try {
      // Start transaction
      await trx._request(`${this.baseUrl}/transaction/start`, "POST");

      // Execute callback with transaction client
      const result = await callback(trx);

      // Commit transaction
      await trx._request(`${this.baseUrl}/transaction/commit`, "POST");

      return result;
    } catch (error) {
      // Rollback transaction on error
      await trx._request(`${this.baseUrl}/transaction/rollback`, "POST");
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

    const url = `${this.baseUrl}/select?${params.toString()}`;
    return this._request<GetResult>(url, "GET");
  }

  /**
   * Execute SELECT query (POST)
   */
  async execute<ExecResult = T>(): Promise<SaintCentralResponse<ExecResult>> {
    if (!this._table) {
      throw new Error("No table specified");
    }

    const payload: any = {
      table: this._table,
      columns: this._columns,
    };

    if (Object.keys(this._whereConditions).length > 0) {
      payload.where = this._whereConditions;
    }

    if (this._filters.length > 0) {
      payload.filters = this._filters;
    }

    if (this._orderBy.length > 0) {
      payload.order = this._orderBy.length === 1 ? this._orderBy[0] : this._orderBy;
    }

    if (this._limitVal !== null) payload.limit = this._limitVal;
    if (this._offsetVal !== null) payload.offset = this._offsetVal;
    if (this._range !== null) payload.range = this._range;
    if (this._joins.length > 0) payload.join = this._joins;
    if (this._singleResult) payload.single = true;
    if (this._countOption) payload.count = true;

    const url = `${this.baseUrl}/select`;
    return this._request<ExecResult>(url, "POST", payload);
  }

  /**
   * Insert data
   */
  async insert<InsertResult = T>(
    tableOrData: string | Record<string, any> | Record<string, any>[],
    data?: Record<string, any> | Record<string, any>[],
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
    const url = `${this.baseUrl}/insert`;
    return this._request<InsertResult>(url, "POST", { table, data: insertData });
  }

  /**
   * Upsert data (insert with on conflict do update)
   */
  async upsert<UpsertResult = T>(
    tableOrData: string | Record<string, any> | Record<string, any>[],
    data?: Record<string, any> | Record<string, any>[],
    options: { onConflict?: string[] } = {},
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

    this._reset();
    const url = `${this.baseUrl}/upsert`;
    return this._request<UpsertResult>(url, "POST", {
      table,
      data: upsertData,
      onConflict: options.onConflict,
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
    const url = `${this.baseUrl}/update`;
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
          _filters: this._filters,
        };
      }
    }

    // Safety check to prevent deleting all rows
    if (!whereConditions || Object.keys(whereConditions).length === 0) {
      throw new Error("No conditions specified for delete. This would delete all rows.");
    }

    this._reset();
    const url = `${this.baseUrl}/delete`;
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

      const result = (await response.json()) as SaintCentralResponse<R>;

      if (!response.ok) {
        console.error(
          `[SaintCentral] Request failed (${response.status}):`,
          result.error || "Unknown error",
        );
        throw new Error(result.error || "Unknown error");
      }

      return result;
    } catch (error) {
      console.error("[SaintCentral] Request failed:", error);
      throw error;
    } finally {
      this._reset();
    }
  }
}

// Create a singleton instance for easy usage
const saintcentral = new SaintCentral("https://saint-central-api.colinmcherney.workers.dev");

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
};
