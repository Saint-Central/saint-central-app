/**
 * SaintCentral SDK - A simplified client for interacting with the SaintCentral API
 */

// Response interfaces
interface SaintCentralResponse<T = any> {
  data: T;
  count?: number;
  params?: any;
  error?: string;
  message?: string;
  details?: any;
}

// Parameter interfaces
interface OrderParams {
  column: string;
  ascending?: boolean;
}

interface JoinConfig {
  table: string;
  on: { foreignKey: string; primaryKey: string };
  columns?: string[];
}

class SaintCentral {
  private baseUrl: string;
  private headers: Record<string, string>;
  private _table: string | null = null;
  private _columns: string | string[] = "*";
  private _whereConditions: Record<string, any> = {};
  private _orderBy: OrderParams | null = null;
  private _limitVal: number | null = null;
  private _offsetVal: number | null = null;
  private _joinConfig: JoinConfig[] | null = null;
  private _singleResult: boolean = false;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
    this.headers = {
      "Content-Type": "application/json",
    };
    this._reset();
  }

  /**
   * Set authentication token for this instance
   */
  auth(token: string): SaintCentral {
    if (token) {
      this.headers["Authorization"] = `Bearer ${token}`;
    }
    return this;
  }

  /**
   * Create a new instance with a different auth token
   */
  withAuth(token: string): SaintCentral {
    const copy = new SaintCentral(this.baseUrl);
    copy.headers = { ...this.headers };
    if (token) {
      copy.headers["Authorization"] = `Bearer ${token}`;
    }
    return copy;
  }

  /**
   * Create a new instance without any auth token
   */
  withoutAuth(): SaintCentral {
    const copy = new SaintCentral(this.baseUrl);
    copy.headers = { ...this.headers };
    delete copy.headers["Authorization"];
    return copy;
  }

  /**
   * Reset query builder
   */
  private _reset(): SaintCentral {
    this._table = null;
    this._columns = "*";
    this._whereConditions = {};
    this._orderBy = null;
    this._limitVal = null;
    this._offsetVal = null;
    this._joinConfig = null;
    this._singleResult = false;
    return this;
  }

  /**
   * Start a query from a table
   */
  from(table: string): SaintCentral {
    this._reset();
    this._table = table;
    return this;
  }

  /**
   * Select columns
   */
  select(columnsOrTable: string | string[] = "*"): SaintCentral {
    if (!this._table && typeof columnsOrTable === "string") {
      this._table = columnsOrTable;
      this._columns = "*";
      return this;
    }

    if (Array.isArray(columnsOrTable)) {
      this._columns = columnsOrTable;
    } else if (typeof columnsOrTable === "string") {
      this._columns =
        columnsOrTable === "*" ? "*" : columnsOrTable.split(",").map((col) => col.trim());
    }
    return this;
  }

  /**
   * Add where conditions
   */
  where(columnOrConditions: string | Record<string, any>, value?: any): SaintCentral {
    if (typeof columnOrConditions === "object") {
      this._whereConditions = { ...this._whereConditions, ...columnOrConditions };
    } else if (typeof columnOrConditions === "string" && value !== undefined) {
      this._whereConditions[columnOrConditions] = value;
    }
    return this;
  }

  /**
   * Order results
   */
  order(column: string, options: { ascending?: boolean } = {}): SaintCentral {
    this._orderBy = { column, ascending: options.ascending !== false };
    return this;
  }

  /**
   * Limit results
   */
  limit(value: number): SaintCentral {
    this._limitVal = value;
    return this;
  }

  /**
   * Offset results
   */
  offset(value: number): SaintCentral {
    this._offsetVal = value;
    return this;
  }

  /**
   * Join another table
   */
  join(
    table: string,
    config: { foreignKey: string; primaryKey: string; columns?: string[] },
  ): SaintCentral {
    if (!this._joinConfig) {
      this._joinConfig = [];
    }
    this._joinConfig.push({
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
   * Return only a single result
   */
  single(): SaintCentral {
    this._singleResult = true;
    return this;
  }

  /**
   * Execute SELECT query (GET)
   */
  async get<T = any>(): Promise<SaintCentralResponse<T>> {
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

    if (Object.keys(this._whereConditions).length > 0) {
      params.append("where", JSON.stringify(this._whereConditions));
    }

    if (this._orderBy) {
      params.append("order", JSON.stringify(this._orderBy));
    }

    if (this._limitVal !== null) {
      params.append("limit", this._limitVal.toString());
    }

    if (this._offsetVal !== null) {
      params.append("offset", this._offsetVal.toString());
    }

    if (this._joinConfig) {
      params.append("join", JSON.stringify(this._joinConfig));
    }

    if (this._singleResult) {
      params.append("single", "true");
    }

    const url = `${this.baseUrl}/select?${params.toString()}`;
    return this._request<T>(url, "GET");
  }

  /**
   * Execute SELECT query (POST)
   */
  async execute<T = any>(): Promise<SaintCentralResponse<T>> {
    if (!this._table) {
      throw new Error("No table specified");
    }

    const payload: any = {
      table: this._table,
      columns: this._columns,
    };

    if (Object.keys(this._whereConditions).length > 0) payload.where = this._whereConditions;
    if (this._orderBy) payload.order = this._orderBy;
    if (this._limitVal !== null) payload.limit = this._limitVal;
    if (this._offsetVal !== null) payload.offset = this._offsetVal;
    if (this._joinConfig) payload.join = this._joinConfig;
    if (this._singleResult) payload.single = true;

    const url = `${this.baseUrl}/select`;
    return this._request<T>(url, "POST", payload);
  }

  /**
   * Insert data
   */
  async insert<T = any>(
    table: string,
    data: Record<string, any> | Record<string, any>[],
  ): Promise<SaintCentralResponse<T>> {
    this._reset();
    const url = `${this.baseUrl}/insert`;
    return this._request<T>(url, "POST", { table, data });
  }

  /**
   * Update data
   */
  async update<T = any>(
    table: string,
    data: Record<string, any>,
    conditions: Record<string, any>,
  ): Promise<SaintCentralResponse<T>> {
    this._reset();
    const url = `${this.baseUrl}/update`;
    return this._request<T>(url, "POST", { table, data, where: conditions });
  }

  /**
   * Delete data
   */
  async delete<T = any>(
    table: string,
    conditions: Record<string, any>,
  ): Promise<SaintCentralResponse<T>> {
    this._reset();
    const url = `${this.baseUrl}/delete`;
    return this._request<T>(url, "POST", { table, where: conditions });
  }

  /**
   * Internal request method
   */
  private async _request<T>(
    url: string,
    method: "GET" | "POST",
    body?: Record<string, any>,
  ): Promise<SaintCentralResponse<T>> {
    try {
      console.log(`[SaintCentral] Request: ${method} ${url}`);

      const response = await fetch(url, {
        method,
        headers: this.headers,
        body: method === "POST" && body ? JSON.stringify(body) : undefined,
      });

      const result = (await response.json()) as SaintCentralResponse<T>;

      if (!response.ok) {
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
export type { SaintCentralResponse, OrderParams, JoinConfig };
