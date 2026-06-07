'use strict';

const { createSchema } = require('../src/lib/schema-validator');

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------
const testColumns = {
  OrderID:   { type: 'Text',   key: true  },
  Amount:    { type: 'Number', key: false },
  Active:    { type: 'Yes/No', key: false },
  OrderDate: { type: 'Date',   key: false },
};

// ===========================================================================
// createSchema
// ===========================================================================
describe('createSchema', () => {
  it('stores tableName', () => {
    const schema = createSchema('Orders', testColumns);
    expect(schema.tableName).toBe('Orders');
  });

  it('stores columns', () => {
    const schema = createSchema('Orders', testColumns);
    expect(schema.columns).toBe(testColumns);
  });

  it('detects keyField from columns where key === true', () => {
    const schema = createSchema('Orders', testColumns);
    expect(schema.keyField).toBe('OrderID');
  });

  it('keyField is undefined when no key column exists', () => {
    const schema = createSchema('NoKey', { Name: { type: 'Text', key: false } });
    expect(schema.keyField).toBeUndefined();
  });
});

// ===========================================================================
// validate()
// ===========================================================================
describe('validate()', () => {
  let schema;
  beforeEach(() => {
    schema = createSchema('Orders', testColumns);
  });

  it('returns valid for a well-formed row', () => {
    const result = schema.validate([{ OrderID: 'A1', Amount: 10 }], 'Add');
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('wraps a single object in an array (no error thrown)', () => {
    const result = schema.validate({ OrderID: 'A1', Amount: 10 }, 'Add');
    expect(result.valid).toBe(true);
  });

  it('reports an error for each unknown column', () => {
    const result = schema.validate(
      [{ OrderID: 'A1', Bogus: 'x', AlsoBogus: 'y' }],
      'Add'
    );
    expect(result.valid).toBe(false);
    const fields = result.errors.map((e) => e.field);
    expect(fields).toContain('Bogus');
    expect(fields).toContain('AlsoBogus');
  });

  it('includes row index and message in unknown-column errors', () => {
    const result = schema.validate([{ OrderID: 'A1', Bogus: 'x' }], 'Add');
    expect(result.errors[0]).toMatchObject({ row: 0, field: 'Bogus' });
    expect(typeof result.errors[0].message).toBe('string');
  });

  it('requires key field for Edit action', () => {
    const result = schema.validate([{ Amount: 99 }], 'Edit');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'OrderID')).toBe(true);
  });

  it('requires key field for Delete action', () => {
    const result = schema.validate([{ Amount: 99 }], 'Delete');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'OrderID')).toBe(true);
  });

  it('does NOT require key field for Add action', () => {
    const result = schema.validate([{ Amount: 99 }], 'Add');
    expect(result.valid).toBe(true);
  });

  it('reports error when key field is present but empty string for Edit', () => {
    const result = schema.validate([{ OrderID: '' }], 'Edit');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'OrderID')).toBe(true);
  });

  it('accumulates errors across multiple rows', () => {
    const result = schema.validate(
      [{ Amount: 10 }, { Amount: 20 }], // both missing key for Edit
      'Edit'
    );
    expect(result.errors.length).toBe(2);
    expect(result.errors[0].row).toBe(0);
    expect(result.errors[1].row).toBe(1);
  });
});

// ===========================================================================
// formatForApi()
// ===========================================================================
describe('formatForApi()', () => {
  let schema;
  beforeEach(() => {
    schema = createSchema('Orders', testColumns);
  });

  it('coerces values correctly: boolean→"Y", ISO date→MM/DD/YYYY, number stays number', () => {
    const { rows, errors } = schema.formatForApi([
      { OrderID: 'A1', Amount: 42.5, Active: true, OrderDate: '2026-06-06' },
    ]);
    expect(errors).toEqual([]);
    expect(rows[0].OrderID).toBe('A1');
    expect(rows[0].Amount).toBe(42.5);
    expect(rows[0].Active).toBe('Y');
    expect(rows[0].OrderDate).toBe('06/06/2026');
  });

  it('wraps a single object in an array', () => {
    const { rows, errors } = schema.formatForApi(
      { OrderID: 'A1', Amount: 5 }
    );
    expect(errors).toEqual([]);
    expect(rows.length).toBe(1);
  });

  it('collects coercion errors (e.g. "not-a-number" for Number field)', () => {
    const { rows: _rows, errors } = schema.formatForApi([
      { OrderID: 'A1', Amount: 'not-a-number' },
    ]);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatchObject({ row: 0, field: 'Amount' });
    expect(typeof errors[0].message).toBe('string');
  });

  it('passes through columns not in schema', () => {
    const { rows, errors } = schema.formatForApi([
      { OrderID: 'A1', ExtraField: 'surprise' },
    ]);
    expect(errors).toEqual([]);
    expect(rows[0].ExtraField).toBe('surprise');
  });

  it('passes through null values without error', () => {
    const { rows, errors } = schema.formatForApi([
      { OrderID: 'A1', Amount: null },
    ]);
    expect(errors).toEqual([]);
    expect(rows[0].Amount).toBeNull();
  });

  it('passes through undefined values without error', () => {
    const { rows, errors } = schema.formatForApi([
      { OrderID: 'A1', Amount: undefined },
    ]);
    expect(errors).toEqual([]);
    expect(rows[0].Amount).toBeUndefined();
  });

  it('returns rows even when some fields have errors', () => {
    const { rows } = schema.formatForApi([
      { OrderID: 'A1', Amount: 'bad', Active: true },
    ]);
    // The row should still exist; the good field should be coerced
    expect(rows.length).toBe(1);
    expect(rows[0].Active).toBe('Y');
  });
});

// ===========================================================================
// parseResponse()
// ===========================================================================
describe('parseResponse()', () => {
  let schema;
  beforeEach(() => {
    schema = createSchema('Orders', testColumns);
  });

  it('converts AppSheet strings to native JS types', () => {
    const result = schema.parseResponse([
      { OrderID: 'A1', Amount: '42.5', Active: 'Y', OrderDate: '06/06/2026' },
    ]);
    expect(result[0].Amount).toBe(42.5);
    expect(result[0].Active).toBe(true);
    expect(result[0].OrderDate).toBe('2026-06-06');
    expect(result[0].OrderID).toBe('A1');
  });

  it('strips _RowNumber from output', () => {
    const result = schema.parseResponse([
      { _RowNumber: 2, OrderID: 'A1', Amount: '10' },
    ]);
    expect(result[0]).not.toHaveProperty('_RowNumber');
  });

  it('passes through columns not in schema', () => {
    const result = schema.parseResponse([
      { OrderID: 'A1', UnknownField: 'hello' },
    ]);
    expect(result[0].UnknownField).toBe('hello');
  });

  it('returns empty array for empty input', () => {
    expect(schema.parseResponse([])).toEqual([]);
  });

  it('returns empty array for null input', () => {
    expect(schema.parseResponse(null)).toEqual([]);
  });

  it('returns empty array for undefined input', () => {
    expect(schema.parseResponse(undefined)).toEqual([]);
  });
});
