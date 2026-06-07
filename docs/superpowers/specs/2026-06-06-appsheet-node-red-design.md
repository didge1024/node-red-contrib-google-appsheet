# node-red-contrib-google-appsheet Design Spec

## Overview

A Node-RED contribution package providing CRUD operations against the Google AppSheet REST API, with schema-driven type validation and coercion. Differentiates from simpler Node-RED API nodes by offering design-time schema discovery, per-column type annotation, write validation with coercion, and structured read parsing.

## Architecture

### Project Structure

```
node-red-contrib-google-appsheet/
├── package.json
├── .gitignore
├── README.md
├── LICENSE
├── examples/
│   └── appsheet-crud.json
├── src/
│   ├── appsheet-config.js
│   ├── appsheet-config.html
│   ├── appsheet-schema.js
│   ├── appsheet-schema.html
│   ├── appsheet.js
│   ├── appsheet.html
│   └── lib/
│       ├── schema-validator.js
│       ├── type-coercion.js
│       └── appsheet-client.js
```

### Dependencies

- `axios` — HTTP client for AppSheet API calls
- Node.js >= 16.0.0
- Node-RED >= 2.0.0

## Node Types

### 1. `appsheet-config` (Config Node)

Hidden configuration node that stores AppSheet credentials.

**Stored data:**
- `appId` (string) — AppSheet app GUID
- `accessKey` (credential, encrypted) — Application Access Key

**Editor UI:**
- Text input for App ID
- Password input for Access Key (stored via Node-RED credential system)
- Label defaults to truncated App ID

**Behavior:**
- No runtime logic — holds credentials only
- Referenced by schema and CRUD nodes via dropdown

### 2. `appsheet-schema` (Schema Node)

Fetches table columns at design time, allows user to annotate types, and outputs a schema object at runtime.

#### Design-Time (Editor UI)

1. User selects an `appsheet-config` node
2. User types the table name (required — AppSheet has no table listing endpoint)
3. User clicks "Fetch Columns" button
4. Node makes a `Find` call with `Selector: "TOP(TableName, 1)"` to get one sample row
5. Extracts `Object.keys()` to populate column list
6. Each column shows as a row with:
   - Column name (read-only)
   - Type dropdown: Text, Number, Date, DateTime, Time, Yes/No, Enum, EnumList, Email, Phone, URL, Image, LatLong, Address, Price, Percent, Ref
   - Key field checkbox (marks primary key — required for Edit/Delete)
7. User can manually add columns not present in sample row (e.g., null columns)
8. Configuration saved as JSON schema definition on the node

#### Runtime

1. Reads saved schema config
2. Constructs a schema object (via `lib/schema-validator.js`)
3. Stores in flow context under key `appsheet_schema_{tableName}`
4. Sends schema object on `msg.schema` for explicit wiring

#### Schema Object Shape

```js
{
  tableName: "Orders",
  keyField: "OrderID",
  columns: {
    "OrderID":   { type: "Text",     key: true },
    "Customer":  { type: "Ref",      key: false },
    "Amount":    { type: "Price",    key: false },
    "OrderDate": { type: "Date",     key: false },
    "Status":    { type: "Enum",     key: false },
    "Tags":      { type: "EnumList", key: false },
    "Active":    { type: "Yes/No",   key: false }
  },
  validate(rows) { ... },
  formatForApi(rows) { ... },
  parseResponse(rows) { ... }
}
```

### 3. `appsheet` (CRUD Node)

Main operation node with two outputs (success + validation error).

#### Editor UI

- Config dropdown — select `appsheet-config` node
- Table — text input (overridable via `msg.table`)
- Action dropdown — Find, Add, Edit, Delete, Action (overridable via `msg.action`)
- Selector — text input for Find queries (overridable via `msg.selector`)
- Action Name — text input, shown only when Action is "Action" (overridable via `msg.actionName`)

#### Input Message

| Property | Purpose |
|---|---|
| `msg.payload` | Row data (object or array of objects) for Add/Edit/Delete. Ignored for Find. |
| `msg.action` | Override node config: "Add", "Find", "Edit", "Delete", "Action" |
| `msg.table` | Override node config table name |
| `msg.selector` | AppSheet filter expression for Find |
| `msg.actionName` | Custom action name when action is "Action" |
| `msg.properties` | Optional Properties object (Locale, Timezone, RunAsUserEmail, etc.) |

#### Processing Pipeline

```
msg received
  → Resolve config (node config merged with msg overrides)
  → Look up schema from flow context (key: appsheet_schema_{tableName})
  → If Add, Edit, or Delete:
      → schema.validate(msg.payload, action) — check key field (Edit/Delete), check unknown columns (Add/Edit)
      → schema.formatForApi(msg.payload) — coerce JS types to AppSheet format (Add/Edit only; Delete sends key field only)
      → If validation errors → output 2 with error details, stop
  → Build request body: { Action, Properties, Rows }
  → POST via appsheet-client.js
  → If Find:
      → schema.parseResponse(response.Rows) — coerce to JS types
      → msg.payload = parsed rows, msg.raw = original response
  → If Add/Edit/Delete/Action:
      → msg.payload = response
  → Send to output 1
```

#### Outputs

1. **Success** — `msg.payload` with results
2. **Validation error** — `msg.payload` with `{ errors: [{ row, field, message }], originalPayload }`

#### No Schema Mode

If no schema is found in flow context and no `msg.schema`, the node operates in passthrough mode: sends raw data without validation/coercion, parses responses as raw JSON. A warning status is shown on the node.

## Library Modules

### `lib/appsheet-client.js`

Thin axios wrapper. Keeps HTTP concerns out of node logic.

**Constructor:** Takes `appId` + `accessKey` from config node.

**Single method:**

```js
client.request({ tableName, action, properties, rows })
```

- `POST https://api.appsheet.com/api/v2/apps/{appId}/tables/{tableName}/Action`
- Headers: `{ "ApplicationAccessKey": accessKey, "Content-Type": "application/json" }`
- Body: `{ Action: action, Properties: properties || {}, Rows: rows || [] }`
- Returns `response.data`
- Throws on HTTP errors with status code + message

**Error mapping:**
- `401` → "Invalid Application Access Key"
- `404` → "App or table not found"
- `429` → "Rate limit exceeded"
- Network errors → "Cannot reach AppSheet API"

No retry logic — users handle retries via Node-RED flow patterns.

### `lib/schema-validator.js`

Constructs schema objects from saved column definitions. Three methods:

**`validate(rows)`** — Pre-flight check:
- Ensures rows is array (wraps single object)
- Checks for unknown column names not in schema
- Checks key field present for Edit/Delete
- For Delete, ensures only key field is provided (strips other fields)
- Returns `{ valid: true }` or `{ valid: false, errors: [{ row, field, message }] }`

**`formatForApi(rows)`** — Coerce valid data for the API:
- Runs each field through its type's `toApi` function
- If coercion fails, adds to errors
- Returns `{ rows: [...coerced], errors: [...failures] }`

**`parseResponse(rows)`** — Structure API response:
- Runs each field through its type's `fromApi` function
- Strips or maps `_RowNumber`
- Returns clean JS objects with native types

### `lib/type-coercion.js`

Per-type coercion rules. Each AppSheet type exports `toApi` and `fromApi` functions.

| AppSheet Type | `toApi` (JS → AppSheet) | `fromApi` (AppSheet → JS) |
|---|---|---|
| Text | passthrough | passthrough |
| Number | ensure numeric, `String(val)` | `parseFloat()` |
| Price | ensure numeric, `String(val)` | `parseFloat()` |
| Percent | ensure 0-1 range, `String(val)` | `parseFloat()` |
| Yes/No | `true`→`"Y"`, `false`→`"N"`, coerce truthy strings | `"Y"`/`"true"`/`"1"`→`true`, else `false` |
| Date | parse Date/ISO/string → `"MM/DD/YYYY"` | `"MM/DD/YYYY"` → ISO 8601 `"2026-06-06"` |
| DateTime | parse → `"MM/DD/YYYY HH:mm:ss"` | → ISO 8601 `"2026-06-06T14:30:00"` |
| Time | validate `HH:mm:ss` format | passthrough |
| Enum | ensure string, validate non-empty | passthrough |
| EnumList | `Array` → `"A , B , C"` | `"A , B , C"` → `["A", "B", "C"]` |
| Email | basic format validation | passthrough |
| Phone | passthrough | passthrough |
| URL | ensure string | passthrough |
| Image | passthrough | passthrough |
| LatLong | `{lat,lng}` → `"lat, lng"` or passthrough | `"lat, lng"` → `{lat: Number, lng: Number}` |
| Address | passthrough | passthrough |
| Ref | passthrough (key value string) | passthrough |

**Coercion philosophy:** Coerce obvious cases (date format conversion, string-to-number, boolean normalization). Reject clearly invalid data (e.g., `"abc"` for Number) — return error instead of sending bad data to AppSheet.

## AppSheet API Reference

**Single endpoint for all operations:**

```
POST https://api.appsheet.com/api/v2/apps/{appId}/tables/{tableName}/Action
```

**Authentication:** `ApplicationAccessKey` header (API key only, no OAuth).

**Request body:**

```json
{
  "Action": "Find",
  "Properties": {
    "Locale": "en-US",
    "Timezone": "UTC",
    "Selector": "Filter(TableName, [Column] = \"value\")"
  },
  "Rows": []
}
```

**Actions:** `Add`, `Find`, `Edit`, `Delete`, or a custom action name.

**Response:** `{ "Rows": [ { ... }, ... ] }` — values returned as strings regardless of column type.

## Design Decisions

1. **Schema node as separate visible node** (not baked into config) — gives users explicit control over type annotations and keeps CRUD node clean.
2. **Flow context for schema sharing** — avoids requiring explicit wiring between schema and CRUD nodes while still allowing it via `msg.schema`.
3. **Two outputs on CRUD node** — validation errors go to output 2, keeping the happy path clean on output 1.
4. **Passthrough mode without schema** — the node remains usable without schema setup, just loses validation/coercion. Lowers barrier to entry.
5. **No retry logic in client** — Node-RED has established patterns for retry/backoff via flow design. Keeping the client simple.
6. **axios over built-in https** — cleaner API, automatic JSON handling, good error objects. Single dependency.
7. **Modular src/ structure** — schema validator and type coercion isolated as testable modules, unlike the flat-file pattern of the Google Sheets nodes.
