# node-red-contrib-google-appsheet

## Description

`node-red-contrib-google-appsheet` provides Node-RED nodes for interacting with [Google AppSheet](https://www.appsheet.com/) databases via the AppSheet API. It supports full CRUD operations (Find, Add, Edit, Delete) and custom actions, with optional schema-driven type validation and coercion that automatically converts between JavaScript-native types and AppSheet's wire format — so your flows work with plain JS objects and dates rather than AppSheet's MM/DD/YYYY strings and Y/N booleans.

---

## Installation

Navigate to your Node-RED user directory (usually `~/.node-red`) and install with npm:

```bash
cd ~/.node-red
npm install node-red-contrib-google-appsheet
```

Then restart Node-RED. The three nodes will appear in the **function** category of the palette.

---

## Setup

### Getting your App ID and Access Key

1. Open your AppSheet app in the editor at [appsheet.com](https://www.appsheet.com).
2. Go to **Settings** → **Integrations** → **IN: from cloud services to your app**.
3. Enable the API toggle if it is not already on.
4. Copy the **App ID** shown under "Identify your app".
5. Click **Create application access key** and copy the generated key.

Keep the access key private — treat it like a password.

---

## Nodes

### appsheet-config

A configuration node that stores your credentials. It holds the **App ID** in plain text and the **Access Key** as an encrypted credential (never stored in the exported flow JSON). All `appsheet` and `appsheet-schema` nodes reference this config node.

### appsheet-schema

Defines the column layout for one AppSheet table. On deploy it registers the schema in Node-RED flow context so downstream `appsheet` nodes pick it up automatically. When triggered by an incoming message it attaches the schema to `msg.schema` and forwards the message.

With a schema configured, the CRUD node will:
- Validate row objects before sending them to the API (unknown columns, missing key fields).
- Coerce JS values to AppSheet wire format on writes (e.g. `true` → `"Y"`, `99.99` → `"99.99"`, JS Date → `"06/06/2026"`).
- Parse AppSheet wire format back to JS types on reads (e.g. `"Y"` → `true`, `"06/06/2026"` → `"2026-06-06"`).

Without a schema the node operates in passthrough mode — data flows through unchanged with a yellow status ring.

### appsheet

Executes a single CRUD operation against an AppSheet table. The action, table name, and selector can be set in the node config or overridden at runtime via `msg` properties. It has two outputs: **output 1** for successful responses and **output 2** for validation errors.

---

## Schema Setup

1. Add an **appsheet-schema** node to your flow.
2. Double-click it to open the editor.
3. Select your **AppSheet Config** node from the dropdown.
4. Enter the **Table name** exactly as it appears in AppSheet (case-sensitive).
5. Click **Fetch Columns** to auto-discover column names from a live sample row. The app must already be deployed and the config node must have valid credentials.
6. For each column, choose the correct **type** from the dropdown (Text, Number, Date, etc.).
7. Check the **Key** checkbox on your primary key column (required for Edit and Delete).
8. You can also add columns manually using the text input at the bottom if they were not present in the sample row.
9. Click **Done** and deploy.

---

## Usage

The `appsheet` node reads action configuration from the node itself, falling back to `msg` overrides. For all write operations, row data comes from `msg.payload` (a single object or an array of objects).

### Find — all rows

```javascript
// Node configured: action = "Find", table = "Orders", selector = ""
// Inject an empty payload
msg.payload = {};
// Output 1: msg.payload = [ { OrderID: "ORD-001", Customer: "Jane Doe", ... }, ... ]
```

### Find — with selector

```javascript
// Node configured: action = "Find", table = "Orders"
// Selector set in node or via msg.selector at runtime:
msg.selector = 'Filter(Orders, [Status] = "Open")';
// Output 1: msg.payload = [ ...only open orders... ]
```

### Add

```javascript
msg.payload = {
  Customer: "John Doe",
  Amount: 99.99,
  OrderDate: "2026-06-06",
  Status: "Open",
  Active: true
};
// Output 1: msg.payload = AppSheet response (added row details)
// Output 2: msg.payload = { errors: [...], originalPayload } on validation failure
```

### Edit

The key field (e.g. `OrderID`) must be included. Only the fields you supply will be updated.

```javascript
msg.payload = {
  OrderID: "ORD-001",
  Customer: "Jane Doe",
  Amount: 149.99
};
// Output 1: msg.payload = AppSheet response
```

### Delete

Only the key field is required. The schema node will strip non-key fields automatically.

```javascript
msg.payload = { OrderID: "ORD-001" };
// Output 1: msg.payload = AppSheet response
```

### Custom Action

Set **action** to `"Action"` and supply the action name in the node config or via `msg.actionName`.

```javascript
msg.actionName = "SendConfirmation";
msg.payload = { OrderID: "ORD-001" };
// The node calls the named AppSheet action on the specified row.
```

### Runtime overrides

Any node property can be overridden per-message:

| Property | Type | Description |
|---|---|---|
| `msg.payload` | object \| array | Row data for Add / Edit / Delete |
| `msg.action` | string | Override action: `"Find"`, `"Add"`, `"Edit"`, `"Delete"`, `"Action"` |
| `msg.table` | string | Override table name |
| `msg.selector` | string | AppSheet filter expression for Find |
| `msg.actionName` | string | Custom action name when action is `"Action"` |
| `msg.properties` | object | Optional API properties: `Locale`, `Timezone`, `RunAsUserEmail` |

---

## Type Coercion

When a schema is configured, the node automatically converts between JavaScript values and AppSheet's wire format.

| Type | JS → AppSheet (toApi) | AppSheet → JS (fromApi) |
|---|---|---|
| **Text** | `String(val)` | string as-is |
| **Number** | `Number(val)` (must be finite) | `parseFloat` |
| **Price** | `Number(val)` (must be finite) | `parseFloat` |
| **Percent** | number in `[0, 1]` as-is | `parseFloat` |
| **Yes/No** | `true`/`"yes"` → `"Y"`, `false`/`"no"` → `"N"` | `"Y"`/`"true"` → `true`, `"N"`/`"false"` → `false` |
| **Date** | `"YYYY-MM-DD"` or Date obj → `"MM/DD/YYYY"` | `"MM/DD/YYYY"` → `"YYYY-MM-DD"` |
| **DateTime** | ISO string or Date obj → `"MM/DD/YYYY HH:mm:ss"` | `"MM/DD/YYYY HH:mm:ss"` → `"YYYY-MM-DDTHH:mm:ss"` |
| **Time** | `"HH:mm"` or `"HH:mm:ss"` → `"HH:mm:ss"` | string as-is |
| **Enum** | non-empty string as-is | string as-is |
| **EnumList** | JS array → `"A , B , C"` (space-comma-space); string as-is | `"A , B , C"` → `["A","B","C"]` |
| **Email** | validated string (must contain `@`) | string as-is |
| **Phone** | `String(val)` | string as-is |
| **URL** | `String(val)` | string as-is |
| **Image** | `String(val)` | string as-is |
| **LatLong** | `{lat, lng}` obj or `"lat, lng"` string → `"lat, lng"` | `"lat, lng"` → `{lat: number, lng: number}` |
| **Address** | `String(val)` | string as-is |
| **Ref** | `String(val)` | string as-is |

Null and undefined values pass through all handlers unchanged. If coercion fails the column's original value is kept and an error is reported on output 2 (validation error output).

---

## Selector Syntax

AppSheet uses its own expression language for filtering rows in a Find operation. Set the selector in the node config or via `msg.selector` at runtime.

| Expression | Description |
|---|---|
| `Filter(Table, [Column] = "value")` | Basic equality filter |
| `Filter(Table, [Amount] >= 100)` | Numeric comparison |
| `And([Status] = "Open", [Active] = true)` | Logical AND of conditions |
| `Or([Status] = "Open", [Status] = "Pending")` | Logical OR of conditions |
| `OrderBy(Filter(Table, [Active]), [Name], true)` | Filter then sort ascending |
| `TOP(Filter(Table, [Status] = "Open"), 10)` | Limit to first N results |
| `TOP([Table], 1)` | Fetch a single sample row |

Selector expressions are passed directly to the AppSheet API. Refer to the [AppSheet expression reference](https://support.google.com/appsheet/answer/10107341) for the full syntax.

---

## License

MIT — see [LICENSE](LICENSE) for details.
