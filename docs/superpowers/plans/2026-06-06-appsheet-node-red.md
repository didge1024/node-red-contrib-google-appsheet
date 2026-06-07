# node-red-contrib-google-appsheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node-RED contribution package with schema-driven CRUD operations against the Google AppSheet REST API.

**Architecture:** Three Node-RED nodes (`appsheet-config`, `appsheet-schema`, `appsheet`) backed by three library modules (`type-coercion.js`, `schema-validator.js`, `appsheet-client.js`). The schema node discovers columns at design time, the user annotates types, and the CRUD node validates/coerces data using the schema before hitting the API.

**Tech Stack:** Node.js >= 16, Node-RED >= 2.0, axios for HTTP

---

## File Map

| File | Responsibility |
|---|---|
| `package.json` | npm metadata, Node-RED node registration, dependency on axios |
| `.gitignore` | Standard Node.js ignores |
| `src/lib/type-coercion.js` | Per-AppSheet-type `toApi` and `fromApi` coercion functions |
| `src/lib/schema-validator.js` | Schema object factory: `validate()`, `formatForApi()`, `parseResponse()` |
| `src/lib/appsheet-client.js` | Thin axios wrapper for the single AppSheet API endpoint |
| `src/appsheet-config.js` | Config node — stores App ID + Access Key credentials |
| `src/appsheet-config.html` | Config node editor UI |
| `src/appsheet-schema.js` | Schema node — runtime: builds schema, stores in flow context |
| `src/appsheet-schema.html` | Schema node editor UI with Fetch Columns button and type dropdowns |
| `src/appsheet.js` | CRUD node — Find/Add/Edit/Delete/Action with schema validation |
| `src/appsheet.html` | CRUD node editor UI and help text |
| `test/type-coercion.test.js` | Tests for every type's `toApi` and `fromApi` |
| `test/schema-validator.test.js` | Tests for validate, formatForApi, parseResponse |
| `test/appsheet-client.test.js` | Tests for API client request building and error mapping |
| `examples/appsheet-crud.json` | Example Node-RED flow demonstrating all operations |
| `README.md` | Installation, setup, usage documentation |
| `LICENSE` | MIT license |

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `LICENSE`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "node-red-contrib-google-appsheet",
  "version": "0.1.0",
  "description": "Node-RED nodes for Google AppSheet CRUD operations with schema-driven type validation",
  "author": "Bell Hart",
  "license": "MIT",
  "keywords": [
    "node-red",
    "google",
    "appsheet",
    "crud",
    "api"
  ],
  "engines": {
    "node": ">=16.0.0"
  },
  "node-red": {
    "nodes": {
      "appsheet-config": "src/appsheet-config.js",
      "appsheet-schema": "src/appsheet-schema.js",
      "appsheet": "src/appsheet.js"
    },
    "version": ">=2.0.0"
  },
  "dependencies": {
    "axios": "^1.7.0"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  },
  "scripts": {
    "test": "jest"
  }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
.DS_Store
*.log
```

- [ ] **Step 3: Create LICENSE**

Standard MIT license file with current year and author name.

- [ ] **Step 4: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, `package-lock.json` generated

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore LICENSE
git commit -m "feat: initialize project with package.json and dependencies"
```

---

### Task 2: Type Coercion Module

This is pure logic with no Node-RED dependencies — the foundation for everything else.

**Files:**
- Create: `src/lib/type-coercion.js`
- Create: `test/type-coercion.test.js`

- [ ] **Step 1: Write failing tests for Text, Number, Price, Percent types**

```js
// test/type-coercion.test.js
const coercion = require('../src/lib/type-coercion');

describe('type-coercion', () => {
  describe('Text', () => {
    test('toApi passes through strings', () => {
      expect(coercion.Text.toApi('hello')).toEqual({ value: 'hello' });
    });

    test('toApi converts non-strings to string', () => {
      expect(coercion.Text.toApi(42)).toEqual({ value: '42' });
    });

    test('fromApi passes through', () => {
      expect(coercion.Text.fromApi('hello')).toBe('hello');
    });
  });

  describe('Number', () => {
    test('toApi accepts number', () => {
      expect(coercion.Number.toApi(42)).toEqual({ value: 42 });
    });

    test('toApi coerces numeric string', () => {
      expect(coercion.Number.toApi('42.5')).toEqual({ value: 42.5 });
    });

    test('toApi rejects non-numeric string', () => {
      expect(coercion.Number.toApi('abc')).toEqual({
        error: 'Cannot convert "abc" to Number'
      });
    });

    test('fromApi parses string to number', () => {
      expect(coercion.Number.fromApi('42.5')).toBe(42.5);
    });

    test('fromApi returns null for empty string', () => {
      expect(coercion.Number.fromApi('')).toBeNull();
    });
  });

  describe('Price', () => {
    test('toApi accepts number', () => {
      expect(coercion.Price.toApi(99.99)).toEqual({ value: 99.99 });
    });

    test('toApi coerces numeric string', () => {
      expect(coercion.Price.toApi('99.99')).toEqual({ value: 99.99 });
    });

    test('toApi rejects non-numeric', () => {
      expect(coercion.Price.toApi('free')).toEqual({
        error: 'Cannot convert "free" to Price'
      });
    });

    test('fromApi parses string to number', () => {
      expect(coercion.Price.fromApi('99.99')).toBe(99.99);
    });
  });

  describe('Percent', () => {
    test('toApi accepts 0-1 range', () => {
      expect(coercion.Percent.toApi(0.75)).toEqual({ value: 0.75 });
    });

    test('toApi rejects value > 1', () => {
      expect(coercion.Percent.toApi(75)).toEqual({
        error: 'Percent value 75 is outside 0-1 range. Did you mean 0.75?'
      });
    });

    test('toApi coerces numeric string in range', () => {
      expect(coercion.Percent.toApi('0.5')).toEqual({ value: 0.5 });
    });

    test('fromApi parses string to number', () => {
      expect(coercion.Percent.fromApi('0.75')).toBe(0.75);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest test/type-coercion.test.js --verbose`
Expected: FAIL — module not found

- [ ] **Step 3: Implement Text, Number, Price, Percent types**

```js
// src/lib/type-coercion.js

function parseNumeric(val, typeName) {
  if (val === null || val === undefined || val === '') {
    return { value: null };
  }
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) {
    return { error: `Cannot convert "${val}" to ${typeName}` };
  }
  return { value: num };
}

const Text = {
  toApi(val) {
    return { value: String(val) };
  },
  fromApi(val) {
    return val;
  }
};

const Number_ = {
  toApi(val) {
    return parseNumeric(val, 'Number');
  },
  fromApi(val) {
    if (val === null || val === undefined || val === '') return null;
    return parseFloat(val);
  }
};

const Price = {
  toApi(val) {
    return parseNumeric(val, 'Price');
  },
  fromApi(val) {
    if (val === null || val === undefined || val === '') return null;
    return parseFloat(val);
  }
};

const Percent = {
  toApi(val) {
    const result = parseNumeric(val, 'Percent');
    if (result.error) return result;
    if (result.value !== null && (result.value < 0 || result.value > 1)) {
      return { error: `Percent value ${result.value} is outside 0-1 range. Did you mean ${result.value / 100}?` };
    }
    return result;
  },
  fromApi(val) {
    if (val === null || val === undefined || val === '') return null;
    return parseFloat(val);
  }
};

module.exports = {
  Text,
  Number: Number_,
  Price,
  Percent
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest test/type-coercion.test.js --verbose`
Expected: All PASS

- [ ] **Step 5: Write failing tests for Yes/No, Date, DateTime, Time types**

```js
// Append to test/type-coercion.test.js

  describe('Yes/No', () => {
    test('toApi converts true to "Y"', () => {
      expect(coercion['Yes/No'].toApi(true)).toEqual({ value: 'Y' });
    });

    test('toApi converts false to "N"', () => {
      expect(coercion['Yes/No'].toApi(false)).toEqual({ value: 'N' });
    });

    test('toApi converts truthy strings', () => {
      expect(coercion['Yes/No'].toApi('yes')).toEqual({ value: 'Y' });
      expect(coercion['Yes/No'].toApi('true')).toEqual({ value: 'Y' });
      expect(coercion['Yes/No'].toApi('1')).toEqual({ value: 'Y' });
      expect(coercion['Yes/No'].toApi('Y')).toEqual({ value: 'Y' });
    });

    test('toApi converts falsy strings', () => {
      expect(coercion['Yes/No'].toApi('no')).toEqual({ value: 'N' });
      expect(coercion['Yes/No'].toApi('false')).toEqual({ value: 'N' });
      expect(coercion['Yes/No'].toApi('0')).toEqual({ value: 'N' });
      expect(coercion['Yes/No'].toApi('N')).toEqual({ value: 'N' });
    });

    test('fromApi converts "Y" to true', () => {
      expect(coercion['Yes/No'].fromApi('Y')).toBe(true);
      expect(coercion['Yes/No'].fromApi('true')).toBe(true);
      expect(coercion['Yes/No'].fromApi('1')).toBe(true);
    });

    test('fromApi converts "N" to false', () => {
      expect(coercion['Yes/No'].fromApi('N')).toBe(false);
      expect(coercion['Yes/No'].fromApi('false')).toBe(false);
      expect(coercion['Yes/No'].fromApi('0')).toBe(false);
    });
  });

  describe('Date', () => {
    test('toApi converts ISO date to MM/DD/YYYY', () => {
      expect(coercion.Date.toApi('2026-06-06')).toEqual({ value: '06/06/2026' });
    });

    test('toApi passes through MM/DD/YYYY', () => {
      expect(coercion.Date.toApi('06/06/2026')).toEqual({ value: '06/06/2026' });
    });

    test('toApi converts Date object', () => {
      const d = new Date(2026, 5, 6); // June 6, 2026
      expect(coercion.Date.toApi(d)).toEqual({ value: '06/06/2026' });
    });

    test('toApi rejects invalid date', () => {
      expect(coercion.Date.toApi('not-a-date')).toEqual({
        error: 'Cannot convert "not-a-date" to Date'
      });
    });

    test('fromApi converts MM/DD/YYYY to ISO', () => {
      expect(coercion.Date.fromApi('06/06/2026')).toBe('2026-06-06');
    });

    test('fromApi converts MM/DD/YYYY HH:mm:ss to ISO date only', () => {
      expect(coercion.Date.fromApi('06/06/2026 14:30:00')).toBe('2026-06-06');
    });
  });

  describe('DateTime', () => {
    test('toApi converts ISO to MM/DD/YYYY HH:mm:ss', () => {
      expect(coercion.DateTime.toApi('2026-06-06T14:30:00')).toEqual({
        value: '06/06/2026 14:30:00'
      });
    });

    test('toApi converts Date object', () => {
      const d = new Date(2026, 5, 6, 14, 30, 0);
      expect(coercion.DateTime.toApi(d)).toEqual({ value: '06/06/2026 14:30:00' });
    });

    test('toApi rejects invalid datetime', () => {
      expect(coercion.DateTime.toApi('garbage')).toEqual({
        error: 'Cannot convert "garbage" to DateTime'
      });
    });

    test('fromApi converts MM/DD/YYYY HH:mm:ss to ISO', () => {
      expect(coercion.DateTime.fromApi('06/06/2026 14:30:00')).toBe('2026-06-06T14:30:00');
    });
  });

  describe('Time', () => {
    test('toApi accepts valid HH:mm:ss', () => {
      expect(coercion.Time.toApi('14:30:00')).toEqual({ value: '14:30:00' });
    });

    test('toApi accepts HH:mm and appends :00', () => {
      expect(coercion.Time.toApi('14:30')).toEqual({ value: '14:30:00' });
    });

    test('toApi rejects invalid time', () => {
      expect(coercion.Time.toApi('25:00:00')).toEqual({
        error: 'Cannot convert "25:00:00" to Time'
      });
    });

    test('fromApi passes through', () => {
      expect(coercion.Time.fromApi('14:30:00')).toBe('14:30:00');
    });
  });
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npx jest test/type-coercion.test.js --verbose`
Expected: FAIL — Yes/No, Date, DateTime, Time not exported

- [ ] **Step 7: Implement Yes/No, Date, DateTime, Time types**

Add to `src/lib/type-coercion.js`:

```js
const TRUTHY = new Set(['true', 'yes', 'y', '1']);
const FALSY = new Set(['false', 'no', 'n', '0']);

const YesNo = {
  toApi(val) {
    if (typeof val === 'boolean') return { value: val ? 'Y' : 'N' };
    const str = String(val).toLowerCase().trim();
    if (TRUTHY.has(str)) return { value: 'Y' };
    if (FALSY.has(str)) return { value: 'N' };
    return { error: `Cannot convert "${val}" to Yes/No` };
  },
  fromApi(val) {
    if (val === null || val === undefined || val === '') return null;
    const str = String(val).toLowerCase().trim();
    return TRUTHY.has(str);
  }
};

function parseDateParts(val) {
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return {
      month: String(val.getMonth() + 1).padStart(2, '0'),
      day: String(val.getDate()).padStart(2, '0'),
      year: String(val.getFullYear()),
      hours: String(val.getHours()).padStart(2, '0'),
      minutes: String(val.getMinutes()).padStart(2, '0'),
      seconds: String(val.getSeconds()).padStart(2, '0')
    };
  }
  const str = String(val).trim();
  // Try ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}):?(\d{2})?)?$/);
  if (isoMatch) {
    return {
      month: isoMatch[2], day: isoMatch[3], year: isoMatch[1],
      hours: isoMatch[4] || '00', minutes: isoMatch[5] || '00', seconds: isoMatch[6] || '00'
    };
  }
  // Try AppSheet format: MM/DD/YYYY or MM/DD/YYYY HH:mm:ss
  const appMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):?(\d{2})?)?$/);
  if (appMatch) {
    return {
      month: appMatch[1].padStart(2, '0'), day: appMatch[2].padStart(2, '0'), year: appMatch[3],
      hours: appMatch[4] || '00', minutes: appMatch[5] || '00', seconds: appMatch[6] || '00'
    };
  }
  return null;
}

const Date_ = {
  toApi(val) {
    const parts = parseDateParts(val);
    if (!parts) return { error: `Cannot convert "${val}" to Date` };
    return { value: `${parts.month}/${parts.day}/${parts.year}` };
  },
  fromApi(val) {
    if (val === null || val === undefined || val === '') return null;
    const parts = parseDateParts(val);
    if (!parts) return val;
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
};

const DateTime = {
  toApi(val) {
    const parts = parseDateParts(val);
    if (!parts) return { error: `Cannot convert "${val}" to DateTime` };
    return { value: `${parts.month}/${parts.day}/${parts.year} ${parts.hours}:${parts.minutes}:${parts.seconds}` };
  },
  fromApi(val) {
    if (val === null || val === undefined || val === '') return null;
    const parts = parseDateParts(val);
    if (!parts) return val;
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hours}:${parts.minutes}:${parts.seconds}`;
  }
};

const Time = {
  toApi(val) {
    const str = String(val).trim();
    const match = str.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return { error: `Cannot convert "${val}" to Time` };
    const h = parseInt(match[1]), m = parseInt(match[2]), s = parseInt(match[3] || '0');
    if (h > 23 || m > 59 || s > 59) return { error: `Cannot convert "${val}" to Time` };
    return { value: `${match[1]}:${match[2]}:${match[3] || '00'}` };
  },
  fromApi(val) {
    return val;
  }
};
```

Update the `module.exports` to include:

```js
module.exports = {
  Text,
  Number: Number_,
  Price,
  Percent,
  'Yes/No': YesNo,
  Date: Date_,
  DateTime,
  Time
};
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx jest test/type-coercion.test.js --verbose`
Expected: All PASS

- [ ] **Step 9: Write failing tests for Enum, EnumList, Email, LatLong and passthrough types**

```js
// Append to test/type-coercion.test.js

  describe('Enum', () => {
    test('toApi accepts non-empty string', () => {
      expect(coercion.Enum.toApi('Active')).toEqual({ value: 'Active' });
    });

    test('toApi rejects empty string', () => {
      expect(coercion.Enum.toApi('')).toEqual({ error: 'Enum value cannot be empty' });
    });

    test('fromApi passes through', () => {
      expect(coercion.Enum.fromApi('Active')).toBe('Active');
    });
  });

  describe('EnumList', () => {
    test('toApi converts array to space-comma-space string', () => {
      expect(coercion.EnumList.toApi(['Tag1', 'Tag2', 'Tag3'])).toEqual({
        value: 'Tag1 , Tag2 , Tag3'
      });
    });

    test('toApi passes through string', () => {
      expect(coercion.EnumList.toApi('Tag1 , Tag2')).toEqual({ value: 'Tag1 , Tag2' });
    });

    test('fromApi splits space-comma-space string to array', () => {
      expect(coercion.EnumList.fromApi('Tag1 , Tag2 , Tag3')).toEqual(['Tag1', 'Tag2', 'Tag3']);
    });

    test('fromApi returns empty array for empty string', () => {
      expect(coercion.EnumList.fromApi('')).toEqual([]);
    });
  });

  describe('Email', () => {
    test('toApi accepts valid email', () => {
      expect(coercion.Email.toApi('user@example.com')).toEqual({ value: 'user@example.com' });
    });

    test('toApi rejects invalid email', () => {
      expect(coercion.Email.toApi('not-an-email')).toEqual({
        error: 'Invalid Email format: "not-an-email"'
      });
    });

    test('fromApi passes through', () => {
      expect(coercion.Email.fromApi('user@example.com')).toBe('user@example.com');
    });
  });

  describe('LatLong', () => {
    test('toApi converts object to string', () => {
      expect(coercion.LatLong.toApi({ lat: 47.6062, lng: -122.3321 })).toEqual({
        value: '47.6062, -122.3321'
      });
    });

    test('toApi passes through valid string', () => {
      expect(coercion.LatLong.toApi('47.6062, -122.3321')).toEqual({
        value: '47.6062, -122.3321'
      });
    });

    test('fromApi parses string to object', () => {
      expect(coercion.LatLong.fromApi('47.6062, -122.3321')).toEqual({
        lat: 47.6062, lng: -122.3321
      });
    });
  });

  describe('passthrough types', () => {
    const passthroughTypes = ['Phone', 'URL', 'Image', 'Address', 'Ref'];
    passthroughTypes.forEach(typeName => {
      test(`${typeName} toApi passes through`, () => {
        expect(coercion[typeName].toApi('some value')).toEqual({ value: 'some value' });
      });

      test(`${typeName} fromApi passes through`, () => {
        expect(coercion[typeName].fromApi('some value')).toBe('some value');
      });
    });
  });
```

- [ ] **Step 10: Run tests to verify they fail**

Run: `npx jest test/type-coercion.test.js --verbose`
Expected: FAIL — Enum, EnumList, etc. not exported

- [ ] **Step 11: Implement Enum, EnumList, Email, LatLong and passthrough types**

Add to `src/lib/type-coercion.js`:

```js
const Enum = {
  toApi(val) {
    const str = String(val).trim();
    if (str === '') return { error: 'Enum value cannot be empty' };
    return { value: str };
  },
  fromApi(val) {
    return val;
  }
};

const EnumList = {
  toApi(val) {
    if (Array.isArray(val)) return { value: val.join(' , ') };
    return { value: String(val) };
  },
  fromApi(val) {
    if (val === null || val === undefined || val === '') return [];
    return String(val).split(' , ').map(s => s.trim());
  }
};

const Email = {
  toApi(val) {
    const str = String(val).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
      return { error: `Invalid Email format: "${val}"` };
    }
    return { value: str };
  },
  fromApi(val) {
    return val;
  }
};

const LatLong = {
  toApi(val) {
    if (typeof val === 'object' && val !== null && 'lat' in val && 'lng' in val) {
      return { value: `${val.lat}, ${val.lng}` };
    }
    return { value: String(val) };
  },
  fromApi(val) {
    if (val === null || val === undefined || val === '') return null;
    const parts = String(val).split(',').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { lat: parts[0], lng: parts[1] };
    }
    return val;
  }
};

function passthrough(typeName) {
  return {
    toApi(val) { return { value: String(val) }; },
    fromApi(val) { return val; }
  };
}

const Phone = passthrough('Phone');
const URL_ = passthrough('URL');
const Image = passthrough('Image');
const Address = passthrough('Address');
const Ref = passthrough('Ref');
```

Update `module.exports`:

```js
module.exports = {
  Text,
  Number: Number_,
  Price,
  Percent,
  'Yes/No': YesNo,
  Date: Date_,
  DateTime,
  Time,
  Enum,
  EnumList,
  Email,
  Phone,
  URL: URL_,
  Image,
  LatLong,
  Address,
  Ref
};
```

- [ ] **Step 12: Run tests to verify all pass**

Run: `npx jest test/type-coercion.test.js --verbose`
Expected: All PASS

- [ ] **Step 13: Commit**

```bash
git add src/lib/type-coercion.js test/type-coercion.test.js
git commit -m "feat: add type coercion module with toApi/fromApi for all AppSheet types"
```

---

### Task 3: Schema Validator Module

Depends on type-coercion. The schema object factory with `validate()`, `formatForApi()`, and `parseResponse()`.

**Files:**
- Create: `src/lib/schema-validator.js`
- Create: `test/schema-validator.test.js`

- [ ] **Step 1: Write failing tests for createSchema and validate()**

```js
// test/schema-validator.test.js
const { createSchema } = require('../src/lib/schema-validator');

const testColumns = {
  OrderID: { type: 'Text', key: true },
  Amount: { type: 'Number', key: false },
  Active: { type: 'Yes/No', key: false },
  OrderDate: { type: 'Date', key: false }
};

describe('schema-validator', () => {
  describe('createSchema', () => {
    test('creates schema with correct properties', () => {
      const schema = createSchema('Orders', testColumns);
      expect(schema.tableName).toBe('Orders');
      expect(schema.keyField).toBe('OrderID');
      expect(schema.columns).toEqual(testColumns);
    });
  });

  describe('validate()', () => {
    const schema = createSchema('Orders', testColumns);

    test('validates valid row', () => {
      const result = schema.validate([{ OrderID: '1', Amount: 42 }]);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('wraps single object in array', () => {
      const result = schema.validate({ OrderID: '1', Amount: 42 });
      expect(result.valid).toBe(true);
    });

    test('warns on unknown columns', () => {
      const result = schema.validate([{ OrderID: '1', Bogus: 'x' }]);
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('Bogus');
      expect(result.errors[0].message).toMatch(/unknown column/i);
    });

    test('validates key field present for Edit', () => {
      const result = schema.validate([{ Amount: 42 }], 'Edit');
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('OrderID');
      expect(result.errors[0].message).toMatch(/key field/i);
    });

    test('validates key field present for Delete', () => {
      const result = schema.validate([{ Amount: 42 }], 'Delete');
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('OrderID');
    });

    test('does not require key field for Add', () => {
      const result = schema.validate([{ Amount: 42 }], 'Add');
      expect(result.valid).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest test/schema-validator.test.js --verbose`
Expected: FAIL — module not found

- [ ] **Step 3: Implement createSchema and validate()**

```js
// src/lib/schema-validator.js
const coercion = require('./type-coercion');

function createSchema(tableName, columns) {
  let keyField = null;
  for (const [name, def] of Object.entries(columns)) {
    if (def.key) { keyField = name; break; }
  }

  return {
    tableName,
    keyField,
    columns,

    validate(rows, action) {
      if (!Array.isArray(rows)) rows = [rows];
      const errors = [];

      rows.forEach((row, i) => {
        // Check for unknown columns
        for (const col of Object.keys(row)) {
          if (!(col in columns)) {
            errors.push({ row: i, field: col, message: `Unknown column "${col}"` });
          }
        }

        // Check key field for Edit/Delete
        if ((action === 'Edit' || action === 'Delete') && keyField) {
          if (!(keyField in row) || row[keyField] === null || row[keyField] === undefined || row[keyField] === '') {
            errors.push({ row: i, field: keyField, message: `Key field "${keyField}" is required for ${action}` });
          }
        }
      });

      return { valid: errors.length === 0, errors };
    },

    formatForApi(rows) {
      // placeholder — implemented in next step
    },

    parseResponse(rows) {
      // placeholder — implemented in next step
    }
  };
}

module.exports = { createSchema };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest test/schema-validator.test.js --verbose`
Expected: All PASS

- [ ] **Step 5: Write failing tests for formatForApi()**

```js
// Append to test/schema-validator.test.js

  describe('formatForApi()', () => {
    const schema = createSchema('Orders', testColumns);

    test('coerces values to AppSheet format', () => {
      const result = schema.formatForApi([{
        OrderID: 'ORD-1',
        Amount: 42,
        Active: true,
        OrderDate: '2026-06-06'
      }]);
      expect(result.errors).toEqual([]);
      expect(result.rows[0]).toEqual({
        OrderID: 'ORD-1',
        Amount: 42,
        Active: 'Y',
        OrderDate: '06/06/2026'
      });
    });

    test('wraps single object in array', () => {
      const result = schema.formatForApi({ OrderID: 'ORD-1', Amount: 42 });
      expect(result.rows).toHaveLength(1);
    });

    test('collects coercion errors', () => {
      const result = schema.formatForApi([{
        OrderID: 'ORD-1',
        Amount: 'not-a-number'
      }]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('Amount');
    });

    test('skips columns not in schema (passes through)', () => {
      const result = schema.formatForApi([{
        OrderID: 'ORD-1',
        Unknown: 'whatever'
      }]);
      expect(result.rows[0].Unknown).toBe('whatever');
    });

    test('handles null/undefined values by passing through', () => {
      const result = schema.formatForApi([{
        OrderID: 'ORD-1',
        Amount: null
      }]);
      expect(result.errors).toEqual([]);
      expect(result.rows[0].Amount).toBeNull();
    });
  });
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npx jest test/schema-validator.test.js --verbose`
Expected: FAIL — formatForApi returns undefined

- [ ] **Step 7: Implement formatForApi()**

Replace the `formatForApi` placeholder in `src/lib/schema-validator.js`:

```js
    formatForApi(rows) {
      if (!Array.isArray(rows)) rows = [rows];
      const errors = [];
      const coercedRows = [];

      rows.forEach((row, i) => {
        const coerced = {};
        for (const [col, val] of Object.entries(row)) {
          if (val === null || val === undefined) {
            coerced[col] = val;
            continue;
          }
          const colDef = columns[col];
          if (!colDef) {
            coerced[col] = val;
            continue;
          }
          const typeHandler = coercion[colDef.type];
          if (!typeHandler) {
            coerced[col] = val;
            continue;
          }
          const result = typeHandler.toApi(val);
          if (result.error) {
            errors.push({ row: i, field: col, message: result.error });
          } else {
            coerced[col] = result.value;
          }
        }
        coercedRows.push(coerced);
      });

      return { rows: coercedRows, errors };
    },
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx jest test/schema-validator.test.js --verbose`
Expected: All PASS

- [ ] **Step 9: Write failing tests for parseResponse()**

```js
// Append to test/schema-validator.test.js

  describe('parseResponse()', () => {
    const schema = createSchema('Orders', testColumns);

    test('parses AppSheet response to JS types', () => {
      const result = schema.parseResponse([{
        _RowNumber: 1,
        OrderID: 'ORD-1',
        Amount: '42.5',
        Active: 'Y',
        OrderDate: '06/06/2026'
      }]);
      expect(result).toEqual([{
        OrderID: 'ORD-1',
        Amount: 42.5,
        Active: true,
        OrderDate: '2026-06-06'
      }]);
    });

    test('strips _RowNumber by default', () => {
      const result = schema.parseResponse([{ _RowNumber: 5, OrderID: 'ORD-1' }]);
      expect(result[0]._RowNumber).toBeUndefined();
    });

    test('passes through columns not in schema', () => {
      const result = schema.parseResponse([{ OrderID: 'ORD-1', Extra: 'val' }]);
      expect(result[0].Extra).toBe('val');
    });

    test('handles empty rows array', () => {
      const result = schema.parseResponse([]);
      expect(result).toEqual([]);
    });
  });
```

- [ ] **Step 10: Run tests to verify they fail**

Run: `npx jest test/schema-validator.test.js --verbose`
Expected: FAIL — parseResponse returns undefined

- [ ] **Step 11: Implement parseResponse()**

Replace the `parseResponse` placeholder in `src/lib/schema-validator.js`:

```js
    parseResponse(rows) {
      if (!rows) return [];
      return rows.map(row => {
        const parsed = {};
        for (const [col, val] of Object.entries(row)) {
          if (col === '_RowNumber') continue;
          const colDef = columns[col];
          if (!colDef) {
            parsed[col] = val;
            continue;
          }
          const typeHandler = coercion[colDef.type];
          if (!typeHandler) {
            parsed[col] = val;
            continue;
          }
          parsed[col] = typeHandler.fromApi(val);
        }
        return parsed;
      });
    }
```

- [ ] **Step 12: Run tests to verify all pass**

Run: `npx jest test/schema-validator.test.js --verbose`
Expected: All PASS

- [ ] **Step 13: Commit**

```bash
git add src/lib/schema-validator.js test/schema-validator.test.js
git commit -m "feat: add schema validator with validate, formatForApi, and parseResponse"
```

---

### Task 4: AppSheet API Client

Thin axios wrapper. Mock-tested — no real API calls.

**Files:**
- Create: `src/lib/appsheet-client.js`
- Create: `test/appsheet-client.test.js`

- [ ] **Step 1: Write failing tests**

```js
// test/appsheet-client.test.js
const axios = require('axios');
const { createClient } = require('../src/lib/appsheet-client');

jest.mock('axios');

describe('appsheet-client', () => {
  const client = createClient('test-app-id', 'test-access-key');

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('sends POST to correct URL', async () => {
    axios.post.mockResolvedValue({ data: { Rows: [] } });

    await client.request({
      tableName: 'Orders',
      action: 'Find',
      properties: { Locale: 'en-US' },
      rows: []
    });

    expect(axios.post).toHaveBeenCalledWith(
      'https://api.appsheet.com/api/v2/apps/test-app-id/tables/Orders/Action',
      {
        Action: 'Find',
        Properties: { Locale: 'en-US' },
        Rows: []
      },
      {
        headers: {
          'ApplicationAccessKey': 'test-access-key',
          'Content-Type': 'application/json'
        }
      }
    );
  });

  test('returns response data on success', async () => {
    const mockData = { Rows: [{ ID: '1', Name: 'Test' }] };
    axios.post.mockResolvedValue({ data: mockData });

    const result = await client.request({
      tableName: 'Orders',
      action: 'Find',
      rows: []
    });

    expect(result).toEqual(mockData);
  });

  test('defaults properties and rows', async () => {
    axios.post.mockResolvedValue({ data: { Rows: [] } });

    await client.request({ tableName: 'Orders', action: 'Find' });

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      { Action: 'Find', Properties: {}, Rows: [] },
      expect.any(Object)
    );
  });

  test('maps 401 to auth error', async () => {
    axios.post.mockRejectedValue({
      response: { status: 401, data: 'Unauthorized' }
    });

    await expect(client.request({ tableName: 'T', action: 'Find' }))
      .rejects.toEqual(expect.objectContaining({
        message: 'Invalid Application Access Key',
        status: 401
      }));
  });

  test('maps 404 to not found error', async () => {
    axios.post.mockRejectedValue({
      response: { status: 404, data: 'Not found' }
    });

    await expect(client.request({ tableName: 'T', action: 'Find' }))
      .rejects.toEqual(expect.objectContaining({
        message: 'App or table not found',
        status: 404
      }));
  });

  test('maps 429 to rate limit error', async () => {
    axios.post.mockRejectedValue({
      response: { status: 429, data: 'Too many', headers: { 'retry-after': '30' } }
    });

    await expect(client.request({ tableName: 'T', action: 'Find' }))
      .rejects.toEqual(expect.objectContaining({
        message: 'Rate limit exceeded',
        status: 429,
        retryAfter: '30'
      }));
  });

  test('maps network error', async () => {
    axios.post.mockRejectedValue({ request: {}, message: 'ECONNREFUSED' });

    await expect(client.request({ tableName: 'T', action: 'Find' }))
      .rejects.toEqual(expect.objectContaining({
        message: 'Cannot reach AppSheet API'
      }));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest test/appsheet-client.test.js --verbose`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the API client**

```js
// src/lib/appsheet-client.js
const axios = require('axios');

const BASE_URL = 'https://api.appsheet.com/api/v2/apps';

const ERROR_MAP = {
  401: 'Invalid Application Access Key',
  404: 'App or table not found',
  429: 'Rate limit exceeded'
};

function createClient(appId, accessKey) {
  return {
    async request({ tableName, action, properties, rows }) {
      const url = `${BASE_URL}/${appId}/tables/${tableName}/Action`;
      const body = {
        Action: action,
        Properties: properties || {},
        Rows: rows || []
      };
      const headers = {
        'ApplicationAccessKey': accessKey,
        'Content-Type': 'application/json'
      };

      try {
        const response = await axios.post(url, body, { headers });
        return response.data;
      } catch (err) {
        if (err.response) {
          const status = err.response.status;
          const error = {
            message: ERROR_MAP[status] || `AppSheet API error: ${status}`,
            status,
            data: err.response.data
          };
          if (status === 429 && err.response.headers) {
            error.retryAfter = err.response.headers['retry-after'];
          }
          throw error;
        }
        if (err.request) {
          throw { message: 'Cannot reach AppSheet API', original: err.message };
        }
        throw err;
      }
    }
  };
}

module.exports = { createClient };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest test/appsheet-client.test.js --verbose`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/appsheet-client.js test/appsheet-client.test.js
git commit -m "feat: add AppSheet API client with error mapping"
```

---

### Task 5: Config Node (appsheet-config)

Simple credential storage node. Follows the `gauth` pattern from Google Sheets.

**Files:**
- Create: `src/appsheet-config.js`
- Create: `src/appsheet-config.html`

- [ ] **Step 1: Implement config node runtime**

```js
// src/appsheet-config.js
module.exports = function (RED) {
  function AppSheetConfig(config) {
    RED.nodes.createNode(this, config);
    this.appId = config.appId;
  }

  RED.nodes.registerType('appsheet-config', AppSheetConfig, {
    credentials: {
      accessKey: { type: 'password' }
    }
  });
};
```

- [ ] **Step 2: Implement config node editor UI**

```html
<!-- src/appsheet-config.html -->
<script type="text/javascript">
  RED.nodes.registerType('appsheet-config', {
    category: 'config',
    defaults: {
      appId: { value: '', required: true },
      name: { value: '' }
    },
    credentials: {
      accessKey: { type: 'password' }
    },
    label: function () {
      return this.name || this.appId || 'AppSheet Config';
    }
  });
</script>

<script type="text/x-red" data-template-name="appsheet-config">
  <div class="form-row">
    <label for="node-config-input-appId">App ID</label>
    <input type="text" id="node-config-input-appId" placeholder="AppSheet App GUID">
  </div>
  <div class="form-row">
    <label for="node-config-input-accessKey">Access Key</label>
    <input type="password" id="node-config-input-accessKey" placeholder="Application Access Key">
  </div>
  <div class="form-row">
    <label for="node-config-input-name">Name</label>
    <input type="text" id="node-config-input-name" placeholder="Optional label">
  </div>
</script>

<script type="text/x-red" data-help-name="appsheet-config">
  <p>Configuration node for Google AppSheet API credentials.</p>
  <h3>Details</h3>
  <p><b>App ID</b> — found in the AppSheet editor under Settings &gt; Integrations. This is the unique GUID for your app.</p>
  <p><b>Access Key</b> — the Application Access Key, also found under Settings &gt; Integrations. Enable the API toggle and click "Create Application Access Key."</p>
</script>
```

- [ ] **Step 3: Commit**

```bash
git add src/appsheet-config.js src/appsheet-config.html
git commit -m "feat: add appsheet-config credential node"
```

---

### Task 6: Schema Node (appsheet-schema)

The design-time schema discovery node. Editor UI makes an HTTP call to fetch columns; runtime stores the schema in flow context.

**Files:**
- Create: `src/appsheet-schema.js`
- Create: `src/appsheet-schema.html`

- [ ] **Step 1: Implement schema node runtime**

```js
// src/appsheet-schema.js
const { createSchema } = require('./lib/schema-validator');

module.exports = function (RED) {
  function AppSheetSchema(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    this.configNode = RED.nodes.getNode(config.configNodeId);
    this.tableName = config.tableName;
    this.columns = {};

    // Parse saved column definitions from config
    try {
      if (config.columns) {
        this.columns = JSON.parse(config.columns);
      }
    } catch (err) {
      node.error('Invalid column configuration: ' + err.message);
    }

    if (Object.keys(this.columns).length > 0) {
      // Build schema and store in flow context
      var schema = createSchema(this.tableName, this.columns);
      node.context().flow.set('appsheet_schema_' + this.tableName, schema);
      node.status({ fill: 'green', shape: 'dot', text: this.tableName + ' (' + Object.keys(this.columns).length + ' cols)' });
    } else {
      node.status({ fill: 'yellow', shape: 'ring', text: 'no columns defined' });
    }

    node.on('input', function (msg) {
      if (Object.keys(node.columns).length > 0) {
        var schema = createSchema(node.tableName, node.columns);
        node.context().flow.set('appsheet_schema_' + node.tableName, schema);
        msg.schema = schema;
        node.send(msg);
      } else {
        node.warn('No columns defined — configure the schema first');
      }
    });
  }

  // Editor endpoint: fetch columns from a sample row
  RED.httpAdmin.post('/appsheet-schema/fetch-columns', RED.auth.needsPermission('appsheet-schema.write'), function (req, res) {
    var configNodeId = req.body.configNodeId;
    var tableName = req.body.tableName;
    var configNode = RED.nodes.getNode(configNodeId);

    if (!configNode) {
      res.status(400).json({ error: 'Config node not found. Deploy the flow first.' });
      return;
    }

    var appId = configNode.appId;
    var accessKey = configNode.credentials.accessKey;

    if (!appId || !accessKey) {
      res.status(400).json({ error: 'App ID or Access Key not configured' });
      return;
    }

    var { createClient } = require('./lib/appsheet-client');
    var client = createClient(appId, accessKey);

    client.request({
      tableName: tableName,
      action: 'Find',
      properties: { Selector: 'TOP([' + tableName + '], 1)' },
      rows: []
    }).then(function (data) {
      if (data.Rows && data.Rows.length > 0) {
        var columns = Object.keys(data.Rows[0]).filter(function (k) {
          return k !== '_RowNumber';
        });
        res.json({ columns: columns });
      } else {
        res.json({ columns: [], warning: 'Table returned no rows' });
      }
    }).catch(function (err) {
      res.status(500).json({ error: err.message || 'Failed to fetch columns' });
    });
  });

  RED.nodes.registerType('appsheet-schema', AppSheetSchema);
};
```

- [ ] **Step 2: Implement schema node editor UI**

```html
<!-- src/appsheet-schema.html -->
<script type="text/javascript">
  RED.nodes.registerType('appsheet-schema', {
    category: 'function',
    color: '#7B68EE',
    defaults: {
      configNodeId: { value: '', type: 'appsheet-config', required: true },
      tableName: { value: '', required: true },
      columns: { value: '{}' },
      name: { value: '' }
    },
    inputs: 1,
    outputs: 1,
    icon: 'font-awesome/fa-columns',
    label: function () {
      return this.name || 'Schema: ' + (this.tableName || 'unconfigured');
    },
    oneditprepare: function () {
      var node = this;
      var columnsData = {};
      try {
        columnsData = JSON.parse(this.columns || '{}');
      } catch (e) {
        columnsData = {};
      }

      var typeOptions = [
        'Text', 'Number', 'Date', 'DateTime', 'Time', 'Yes/No',
        'Enum', 'EnumList', 'Email', 'Phone', 'URL', 'Image',
        'LatLong', 'Address', 'Price', 'Percent', 'Ref'
      ];

      function renderColumns(cols) {
        var container = $('#node-input-columns-container');
        container.empty();
        Object.keys(cols).forEach(function (colName) {
          var def = cols[colName];
          var row = $('<div class="form-row appsheet-col-row" style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"></div>');
          row.append('<span style="min-width:140px;font-weight:bold;">' + colName + '</span>');
          var select = $('<select class="appsheet-col-type" data-col="' + colName + '" style="width:120px;"></select>');
          typeOptions.forEach(function (t) {
            select.append('<option value="' + t + '"' + (def.type === t ? ' selected' : '') + '>' + t + '</option>');
          });
          row.append(select);
          var keyCheck = $('<label style="display:flex;align-items:center;gap:4px;"><input type="checkbox" class="appsheet-col-key" data-col="' + colName + '"' + (def.key ? ' checked' : '') + '> Key</label>');
          row.append(keyCheck);
          var removeBtn = $('<button type="button" class="red-ui-button red-ui-button-small appsheet-col-remove" data-col="' + colName + '">x</button>');
          row.append(removeBtn);
          container.append(row);
        });

        container.find('.appsheet-col-remove').on('click', function () {
          var col = $(this).data('col');
          delete cols[col];
          renderColumns(cols);
        });
      }

      renderColumns(columnsData);

      $('#appsheet-fetch-columns').on('click', function () {
        var configNodeId = $('#node-input-configNodeId').val();
        var tableName = $('#node-input-tableName').val();
        if (!configNodeId || !tableName) {
          RED.notify('Please select a config and enter a table name', 'error');
          return;
        }
        var btn = $(this);
        btn.prop('disabled', true).text('Fetching...');
        $.ajax({
          url: 'appsheet-schema/fetch-columns',
          type: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({ configNodeId: configNodeId, tableName: tableName }),
          success: function (data) {
            if (data.warning) RED.notify(data.warning, 'warning');
            data.columns.forEach(function (col) {
              if (!columnsData[col]) {
                columnsData[col] = { type: 'Text', key: false };
              }
            });
            renderColumns(columnsData);
            btn.prop('disabled', false).text('Fetch Columns');
          },
          error: function (xhr) {
            var msg = xhr.responseJSON ? xhr.responseJSON.error : 'Fetch failed';
            RED.notify(msg, 'error');
            btn.prop('disabled', false).text('Fetch Columns');
          }
        });
      });

      $('#appsheet-add-column').on('click', function () {
        var newName = $('#appsheet-new-col-name').val().trim();
        if (!newName) return;
        if (columnsData[newName]) { RED.notify('Column already exists', 'warning'); return; }
        columnsData[newName] = { type: 'Text', key: false };
        renderColumns(columnsData);
        $('#appsheet-new-col-name').val('');
      });

      // Save columns back before dialog closes
      node._columnsData = columnsData;
    },
    oneditsave: function () {
      var cols = {};
      var container = $('#node-input-columns-container');
      container.find('.appsheet-col-row').each(function () {
        var colName = $(this).find('.appsheet-col-type').data('col');
        var type = $(this).find('.appsheet-col-type').val();
        var key = $(this).find('.appsheet-col-key').is(':checked');
        cols[colName] = { type: type, key: key };
      });
      this.columns = JSON.stringify(cols);
    }
  });
</script>

<script type="text/x-red" data-template-name="appsheet-schema">
  <div class="form-row">
    <label for="node-input-configNodeId">Config</label>
    <input type="text" id="node-input-configNodeId">
  </div>
  <div class="form-row">
    <label for="node-input-tableName">Table</label>
    <input type="text" id="node-input-tableName" placeholder="Table name (case-sensitive)">
  </div>
  <div class="form-row">
    <button type="button" id="appsheet-fetch-columns" class="red-ui-button" style="width:100%;">Fetch Columns</button>
  </div>
  <div class="form-row">
    <label>Columns</label>
    <div id="node-input-columns-container" style="max-height:300px;overflow-y:auto;border:1px solid #ccc;padding:8px;border-radius:4px;"></div>
  </div>
  <div class="form-row" style="display:flex;gap:8px;">
    <input type="text" id="appsheet-new-col-name" placeholder="Add column manually" style="flex:1;">
    <button type="button" id="appsheet-add-column" class="red-ui-button">Add</button>
  </div>
  <div class="form-row">
    <label for="node-input-name"><i class="icon-tag"></i> Name</label>
    <input type="text" id="node-input-name" placeholder="label">
  </div>
</script>

<script type="text/x-red" data-help-name="appsheet-schema">
  <p>Defines the schema for an AppSheet table. Enables type validation and coercion on downstream CRUD nodes.</p>

  <h3>Setup</h3>
  <ol>
    <li>Select an <b>AppSheet Config</b> node with your App ID and Access Key.</li>
    <li>Enter the exact <b>Table name</b> (case-sensitive, must match AppSheet).</li>
    <li>Click <b>Fetch Columns</b> to auto-discover column names from a sample row.</li>
    <li>Set the <b>type</b> for each column using the dropdown.</li>
    <li>Check the <b>Key</b> checkbox on your primary key column.</li>
    <li>You can also add columns manually if they weren't in the sample row.</li>
  </ol>

  <h3>Runtime</h3>
  <p>On startup and when triggered, the schema is stored in flow context under
  <code>appsheet_schema_{tableName}</code>. CRUD nodes automatically look up the schema from flow context.</p>
  <p>The schema object is also sent on <code>msg.schema</code> for explicit wiring.</p>

  <h3>Supported Types</h3>
  <p>Text, Number, Date, DateTime, Time, Yes/No, Enum, EnumList, Email, Phone, URL, Image, LatLong, Address, Price, Percent, Ref</p>
</script>
```

- [ ] **Step 3: Commit**

```bash
git add src/appsheet-schema.js src/appsheet-schema.html
git commit -m "feat: add appsheet-schema node with design-time column fetch and type annotation"
```

---

### Task 7: CRUD Node (appsheet)

The main operation node. Uses config for credentials, looks up schema from flow context, validates/coerces, calls API, parses response.

**Files:**
- Create: `src/appsheet.js`
- Create: `src/appsheet.html`

- [ ] **Step 1: Implement CRUD node runtime**

```js
// src/appsheet.js
const { createClient } = require('./lib/appsheet-client');
const { createSchema } = require('./lib/schema-validator');

module.exports = function (RED) {
  function AppSheet(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    this.configNode = RED.nodes.getNode(config.configNodeId);

    if (!this.configNode) {
      node.status({ fill: 'red', shape: 'ring', text: 'missing config' });
      return;
    }

    var appId = this.configNode.appId;
    var accessKey = this.configNode.credentials.accessKey;

    if (!appId || !accessKey) {
      node.status({ fill: 'red', shape: 'ring', text: 'missing credentials' });
      return;
    }

    var client = createClient(appId, accessKey);
    node.status({});

    node.on('input', function (msg, send, done) {
      send = send || function () { node.send.apply(node, arguments); };
      done = done || function (err) { if (err) node.error(err, msg); };

      var tableName = msg.table || config.tableName;
      var action = msg.action || config.action;
      var selector = msg.selector || config.selector || '';
      var actionName = msg.actionName || config.actionName || '';
      var properties = msg.properties || {};

      if (!tableName) {
        node.status({ fill: 'red', shape: 'dot', text: 'no table specified' });
        done(new Error('No table specified'));
        return;
      }
      if (!action) {
        node.status({ fill: 'red', shape: 'dot', text: 'no action specified' });
        done(new Error('No action specified'));
        return;
      }

      // Look up schema from flow context or msg
      var schema = msg.schema || node.context().flow.get('appsheet_schema_' + tableName);
      var hasSchema = schema && schema.columns && Object.keys(schema.columns).length > 0;

      if (!hasSchema) {
        node.status({ fill: 'yellow', shape: 'ring', text: 'no schema — passthrough mode' });
      }

      // Determine the API action name
      var apiAction = action === 'Action' ? actionName : action;

      // Build rows
      var rows = [];
      if (action === 'Find') {
        if (selector) {
          properties.Selector = selector;
        }
      } else {
        var payload = msg.payload;
        if (payload !== null && payload !== undefined) {
          rows = Array.isArray(payload) ? payload : [payload];
        }
      }

      // Validate and coerce if schema is available
      if (hasSchema && (action === 'Add' || action === 'Edit' || action === 'Delete')) {
        var validation = schema.validate(rows, action);
        if (!validation.valid) {
          msg.payload = { errors: validation.errors, originalPayload: msg.payload };
          send([null, msg]);
          done();
          return;
        }

        if (action === 'Delete') {
          // For delete, only send key field
          rows = rows.map(function (row) {
            var keyOnly = {};
            if (schema.keyField && row[schema.keyField] !== undefined) {
              keyOnly[schema.keyField] = row[schema.keyField];
            }
            return keyOnly;
          });
        } else {
          var formatted = schema.formatForApi(rows);
          if (formatted.errors.length > 0) {
            msg.payload = { errors: formatted.errors, originalPayload: msg.payload };
            send([null, msg]);
            done();
            return;
          }
          rows = formatted.rows;
        }
      }

      node.status({ fill: 'blue', shape: 'dot', text: action + '...' });

      client.request({
        tableName: tableName,
        action: apiAction,
        properties: properties,
        rows: rows
      }).then(function (data) {
        if (action === 'Find' && hasSchema && data.Rows) {
          msg.raw = data;
          msg.payload = schema.parseResponse(data.Rows);
        } else {
          msg.payload = data;
        }
        node.status({ fill: 'green', shape: 'dot', text: action + ' OK' });
        send([msg, null]);
        done();
      }).catch(function (err) {
        node.status({ fill: 'red', shape: 'dot', text: err.message || 'error' });
        msg.error = err;
        done(err.message || err);
      });
    });
  }

  RED.nodes.registerType('appsheet', AppSheet);
};
```

- [ ] **Step 2: Implement CRUD node editor UI**

```html
<!-- src/appsheet.html -->
<script type="text/javascript">
  RED.nodes.registerType('appsheet', {
    category: 'function',
    color: '#4285F4',
    defaults: {
      configNodeId: { value: '', type: 'appsheet-config', required: true },
      tableName: { value: '' },
      action: { value: 'Find' },
      selector: { value: '' },
      actionName: { value: '' },
      name: { value: '' }
    },
    inputs: 1,
    outputs: 2,
    outputLabels: ['success', 'validation error'],
    icon: 'font-awesome/fa-database',
    label: function () {
      return this.name || 'AppSheet ' + (this.action || '');
    },
    oneditprepare: function () {
      var actionSelect = $('#node-input-action');
      var selectorRow = $('#appsheet-selector-row');
      var actionNameRow = $('#appsheet-actionname-row');

      function toggleFields() {
        var action = actionSelect.val();
        selectorRow.toggle(action === 'Find');
        actionNameRow.toggle(action === 'Action');
      }

      actionSelect.on('change', toggleFields);
      toggleFields();
    }
  });
</script>

<script type="text/x-red" data-template-name="appsheet">
  <div class="form-row">
    <label for="node-input-configNodeId">Config</label>
    <input type="text" id="node-input-configNodeId">
  </div>
  <div class="form-row">
    <label for="node-input-tableName">Table</label>
    <input type="text" id="node-input-tableName" placeholder="Table name (or set via msg.table)">
  </div>
  <div class="form-row">
    <label for="node-input-action">Action</label>
    <select id="node-input-action" style="width:70%;">
      <option value="Find">Find</option>
      <option value="Add">Add</option>
      <option value="Edit">Edit</option>
      <option value="Delete">Delete</option>
      <option value="Action">Action</option>
    </select>
  </div>
  <div class="form-row" id="appsheet-selector-row">
    <label for="node-input-selector">Selector</label>
    <input type="text" id="node-input-selector" placeholder="Filter(Table, [Col] = &quot;value&quot;)">
  </div>
  <div class="form-row" id="appsheet-actionname-row" style="display:none;">
    <label for="node-input-actionName">Action Name</label>
    <input type="text" id="node-input-actionName" placeholder="Custom action name">
  </div>
  <div class="form-row">
    <label for="node-input-name"><i class="icon-tag"></i> Name</label>
    <input type="text" id="node-input-name" placeholder="label">
  </div>
</script>

<script type="text/x-red" data-help-name="appsheet">
  <p>Perform CRUD operations on Google AppSheet tables.</p>

  <h3>Actions</h3>
  <dl>
    <dt>Find</dt><dd>Read rows from a table. Use <code>Selector</code> for filtering (AppSheet expression syntax).</dd>
    <dt>Add</dt><dd>Insert new rows. Send row data in <code>msg.payload</code> (object or array of objects).</dd>
    <dt>Edit</dt><dd>Update existing rows. Each row must include the key field.</dd>
    <dt>Delete</dt><dd>Remove rows. Each row must include the key field.</dd>
    <dt>Action</dt><dd>Invoke a custom AppSheet action by name.</dd>
  </dl>

  <h3>Inputs</h3>
  <dl class="message-properties">
    <dt>payload <span class="property-type">object | array</span></dt>
    <dd>Row data for Add/Edit/Delete. Ignored for Find.</dd>
    <dt>action <span class="property-type">string</span></dt>
    <dd>Override action: "Find", "Add", "Edit", "Delete", "Action"</dd>
    <dt>table <span class="property-type">string</span></dt>
    <dd>Override table name</dd>
    <dt>selector <span class="property-type">string</span></dt>
    <dd>AppSheet filter expression for Find</dd>
    <dt>actionName <span class="property-type">string</span></dt>
    <dd>Custom action name when action is "Action"</dd>
    <dt>properties <span class="property-type">object</span></dt>
    <dd>Optional: Locale, Timezone, RunAsUserEmail</dd>
  </dl>

  <h3>Outputs</h3>
  <ol>
    <li><b>Success</b> — <code>msg.payload</code> contains results. For Find with schema, values are parsed to native JS types and <code>msg.raw</code> has the original response.</li>
    <li><b>Validation Error</b> — <code>msg.payload</code> contains <code>{ errors: [...], originalPayload }</code></li>
  </ol>

  <h3>Schema</h3>
  <p>If an <b>appsheet-schema</b> node is configured for the same table, this node automatically validates writes and parses reads. Without a schema, data passes through unmodified (warning shown).</p>

  <h3>Selector Syntax</h3>
  <p>AppSheet uses its own expression language for filtering:</p>
  <ul>
    <li><code>Filter(Table, [Column] = "value")</code></li>
    <li><code>And([Col1] = "A", [Col2] >= 10)</code></li>
    <li><code>OrderBy(Filter(Table, [Active]), [Name], true)</code></li>
    <li><code>TOP(Filter(Table, [Status] = "Open"), 10)</code></li>
  </ul>
</script>
```

- [ ] **Step 3: Commit**

```bash
git add src/appsheet.js src/appsheet.html
git commit -m "feat: add appsheet CRUD node with schema validation and dual outputs"
```

---

### Task 8: Example Flow and README

**Files:**
- Create: `examples/appsheet-crud.json`
- Create: `README.md`

- [ ] **Step 1: Create example flow**

Create `examples/appsheet-crud.json` with a Node-RED flow JSON containing:
- One `appsheet-config` node with placeholder credentials
- One `appsheet-schema` node for a sample "Orders" table with columns: OrderID (Text, key), Customer (Text), Amount (Price), OrderDate (Date), Status (Enum), Active (Yes/No)
- Four `appsheet` CRUD nodes: Find All, Add Row, Edit Row, Delete Row
- Inject nodes to trigger each operation with sample payloads
- Debug nodes on both outputs of each CRUD node
- A comment node explaining setup steps

The flow should follow the same structure as `examples/Google Sheets.json` — groups for each operation with inject → appsheet → debug wiring.

- [ ] **Step 2: Create README.md**

Write `README.md` with sections:
- **Installation** — `npm install node-red-contrib-google-appsheet`
- **Setup** — How to get App ID and Access Key from AppSheet Settings > Integrations
- **Nodes** — Brief description of each node type (Config, Schema, CRUD)
- **Schema Setup** — Step-by-step for using the schema node
- **Usage** — Examples for each CRUD operation showing input msg format
- **Selector Syntax** — Quick reference for AppSheet filter expressions
- **Type Coercion** — Table of supported types and how they're converted
- **License** — MIT

- [ ] **Step 3: Commit**

```bash
git add examples/appsheet-crud.json README.md
git commit -m "docs: add example flow and README"
```

---

### Task 9: Integration Smoke Test

Verify everything loads in Node-RED without errors.

- [ ] **Step 1: Run unit tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 2: Verify Node-RED can load the nodes**

Run: `node -e "const nr = require('./src/appsheet-config.js'); console.log('config:', typeof nr);"` and similar for each node file to verify they export functions without syntax errors.

Run: `node -e "require('./src/lib/type-coercion'); require('./src/lib/schema-validator'); require('./src/lib/appsheet-client'); console.log('All modules load OK');"` to verify lib modules.

Expected: No errors, all modules export correctly.

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address any issues found during smoke test"
```

Only create this commit if fixes were needed.
