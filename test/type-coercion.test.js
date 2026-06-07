'use strict';

const coercion = require('../src/lib/type-coercion');

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function expectError(result) {
  expect(result).toHaveProperty('error');
  expect(typeof result.error).toBe('string');
}

// ===========================================================================
// Text
// ===========================================================================
describe('Text', () => {
  describe('toApi', () => {
    it('passes string through', () => {
      expect(coercion.Text.toApi('hello')).toEqual({ value: 'hello' });
    });
    it('converts number to string', () => {
      expect(coercion.Text.toApi(42)).toEqual({ value: '42' });
    });
    it('converts boolean to string', () => {
      expect(coercion.Text.toApi(true)).toEqual({ value: 'true' });
    });
    it('returns error for null', () => {
      expectError(coercion.Text.toApi(null));
    });
    it('returns error for undefined', () => {
      expectError(coercion.Text.toApi(undefined));
    });
  });
  describe('fromApi', () => {
    it('passes string through', () => {
      expect(coercion.Text.fromApi('hello')).toBe('hello');
    });
    it('returns null for empty string', () => {
      expect(coercion.Text.fromApi('')).toBeNull();
    });
    it('returns null for null', () => {
      expect(coercion.Text.fromApi(null)).toBeNull();
    });
    it('returns null for undefined', () => {
      expect(coercion.Text.fromApi(undefined)).toBeNull();
    });
  });
});

// ===========================================================================
// Number
// ===========================================================================
describe('Number', () => {
  describe('toApi', () => {
    it('passes integer through', () => {
      expect(coercion.Number.toApi(42)).toEqual({ value: 42 });
    });
    it('passes float through', () => {
      expect(coercion.Number.toApi(3.14)).toEqual({ value: 3.14 });
    });
    it('coerces numeric string', () => {
      expect(coercion.Number.toApi('42')).toEqual({ value: 42 });
    });
    it('coerces float string', () => {
      expect(coercion.Number.toApi('3.14')).toEqual({ value: 3.14 });
    });
    it('returns error for non-numeric string', () => {
      expect(coercion.Number.toApi('abc')).toEqual({ error: 'Cannot convert "abc" to Number' });
    });
    it('returns error for null', () => {
      expectError(coercion.Number.toApi(null));
    });
    it('returns error for undefined', () => {
      expectError(coercion.Number.toApi(undefined));
    });
    it('returns error for empty string', () => {
      expectError(coercion.Number.toApi(''));
    });
    it('returns error for object', () => {
      expectError(coercion.Number.toApi({}));
    });
    it('returns error for true', () => {
      expectError(coercion.Number.toApi(true));
    });
    it('returns error for false', () => {
      expectError(coercion.Number.toApi(false));
    });
  });
  describe('fromApi', () => {
    it('parses integer string', () => {
      expect(coercion.Number.fromApi('42')).toBe(42);
    });
    it('parses float string', () => {
      expect(coercion.Number.fromApi('42.5')).toBe(42.5);
    });
    it('returns number unchanged', () => {
      expect(coercion.Number.fromApi(7)).toBe(7);
    });
    it('returns null for empty string', () => {
      expect(coercion.Number.fromApi('')).toBeNull();
    });
    it('returns null for null', () => {
      expect(coercion.Number.fromApi(null)).toBeNull();
    });
    it('returns null for undefined', () => {
      expect(coercion.Number.fromApi(undefined)).toBeNull();
    });
    it('returns null for non-numeric string "abc"', () => {
      expect(coercion.Number.fromApi('abc')).toBeNull();
    });
    it('returns null for "Infinity" string', () => {
      expect(coercion.Number.fromApi('Infinity')).toBeNull();
    });
  });
});

// ===========================================================================
// Price
// ===========================================================================
describe('Price', () => {
  describe('toApi', () => {
    it('passes number through', () => {
      expect(coercion.Price.toApi(9.99)).toEqual({ value: 9.99 });
    });
    it('coerces numeric string', () => {
      expect(coercion.Price.toApi('19.99')).toEqual({ value: 19.99 });
    });
    it('returns error for non-numeric string', () => {
      expect(coercion.Price.toApi('abc')).toEqual({ error: 'Cannot convert "abc" to Price' });
    });
    it('returns error for null', () => {
      expectError(coercion.Price.toApi(null));
    });
    it('returns error for undefined', () => {
      expectError(coercion.Price.toApi(undefined));
    });
  });
  describe('fromApi', () => {
    it('parses float string', () => {
      expect(coercion.Price.fromApi('9.99')).toBe(9.99);
    });
    it('returns null for empty string', () => {
      expect(coercion.Price.fromApi('')).toBeNull();
    });
    it('returns null for null', () => {
      expect(coercion.Price.fromApi(null)).toBeNull();
    });
    it('returns null for non-numeric string "abc"', () => {
      expect(coercion.Price.fromApi('abc')).toBeNull();
    });
  });
});

// ===========================================================================
// Percent
// ===========================================================================
describe('Percent', () => {
  describe('toApi', () => {
    it('accepts 0', () => {
      expect(coercion.Percent.toApi(0)).toEqual({ value: 0 });
    });
    it('accepts 1', () => {
      expect(coercion.Percent.toApi(1)).toEqual({ value: 1 });
    });
    it('accepts 0.5', () => {
      expect(coercion.Percent.toApi(0.5)).toEqual({ value: 0.5 });
    });
    it('accepts string "0.75"', () => {
      expect(coercion.Percent.toApi('0.75')).toEqual({ value: 0.75 });
    });
    it('returns error for value > 1 with suggestion', () => {
      const result = coercion.Percent.toApi(75);
      expect(result).toHaveProperty('error');
      expect(result.error).toMatch(/0\.75/);
    });
    it('returns error for value < 0', () => {
      expectError(coercion.Percent.toApi(-0.1));
    });
    it('returns error for non-numeric', () => {
      expectError(coercion.Percent.toApi('abc'));
    });
    it('returns error for null', () => {
      expectError(coercion.Percent.toApi(null));
    });
  });
  describe('fromApi', () => {
    it('parses float string', () => {
      expect(coercion.Percent.fromApi('0.75')).toBe(0.75);
    });
    it('returns null for empty string', () => {
      expect(coercion.Percent.fromApi('')).toBeNull();
    });
    it('returns null for null', () => {
      expect(coercion.Percent.fromApi(null)).toBeNull();
    });
    it('returns null for non-numeric string "abc"', () => {
      expect(coercion.Percent.fromApi('abc')).toBeNull();
    });
  });
});

// ===========================================================================
// Yes/No
// ===========================================================================
describe('Yes/No', () => {
  describe('toApi', () => {
    it('converts true → "Y"', () => {
      expect(coercion['Yes/No'].toApi(true)).toEqual({ value: 'Y' });
    });
    it('converts false → "N"', () => {
      expect(coercion['Yes/No'].toApi(false)).toEqual({ value: 'N' });
    });
    it('converts "yes" → "Y"', () => {
      expect(coercion['Yes/No'].toApi('yes')).toEqual({ value: 'Y' });
    });
    it('converts "YES" → "Y"', () => {
      expect(coercion['Yes/No'].toApi('YES')).toEqual({ value: 'Y' });
    });
    it('converts "true" → "Y"', () => {
      expect(coercion['Yes/No'].toApi('true')).toEqual({ value: 'Y' });
    });
    it('converts "1" → "Y"', () => {
      expect(coercion['Yes/No'].toApi('1')).toEqual({ value: 'Y' });
    });
    it('converts "Y" → "Y"', () => {
      expect(coercion['Yes/No'].toApi('Y')).toEqual({ value: 'Y' });
    });
    it('converts "no" → "N"', () => {
      expect(coercion['Yes/No'].toApi('no')).toEqual({ value: 'N' });
    });
    it('converts "false" → "N"', () => {
      expect(coercion['Yes/No'].toApi('false')).toEqual({ value: 'N' });
    });
    it('converts "0" → "N"', () => {
      expect(coercion['Yes/No'].toApi('0')).toEqual({ value: 'N' });
    });
    it('converts "N" → "N"', () => {
      expect(coercion['Yes/No'].toApi('N')).toEqual({ value: 'N' });
    });
    it('returns error for unrecognized string', () => {
      expectError(coercion['Yes/No'].toApi('maybe'));
    });
    it('returns error for null', () => {
      expectError(coercion['Yes/No'].toApi(null));
    });
    it('returns error for undefined', () => {
      expectError(coercion['Yes/No'].toApi(undefined));
    });
  });
  describe('fromApi', () => {
    it('"Y" → true', () => {
      expect(coercion['Yes/No'].fromApi('Y')).toBe(true);
    });
    it('"N" → false', () => {
      expect(coercion['Yes/No'].fromApi('N')).toBe(false);
    });
    it('"true" → true', () => {
      expect(coercion['Yes/No'].fromApi('true')).toBe(true);
    });
    it('"1" → true', () => {
      expect(coercion['Yes/No'].fromApi('1')).toBe(true);
    });
    it('"false" → false', () => {
      expect(coercion['Yes/No'].fromApi('false')).toBe(false);
    });
    it('"0" → false', () => {
      expect(coercion['Yes/No'].fromApi('0')).toBe(false);
    });
    it('returns null for empty string', () => {
      expect(coercion['Yes/No'].fromApi('')).toBeNull();
    });
    it('returns null for null', () => {
      expect(coercion['Yes/No'].fromApi(null)).toBeNull();
    });
    it('returns null for undefined', () => {
      expect(coercion['Yes/No'].fromApi(undefined)).toBeNull();
    });
  });
});

// ===========================================================================
// Date
// ===========================================================================
describe('Date', () => {
  describe('toApi', () => {
    it('converts ISO date string → MM/DD/YYYY', () => {
      expect(coercion.Date.toApi('2026-06-06')).toEqual({ value: '06/06/2026' });
    });
    it('converts Date object → MM/DD/YYYY', () => {
      // Use UTC to avoid timezone surprises
      const d = new global.Date('2026-06-06T00:00:00Z');
      const result = coercion.Date.toApi(d);
      expect(result).toHaveProperty('value');
      // Accept any MM/DD/YYYY that includes the correct parts
      expect(result.value).toMatch(/\d{2}\/\d{2}\/2026/);
    });
    it('passes through already-formatted MM/DD/YYYY', () => {
      expect(coercion.Date.toApi('06/06/2026')).toEqual({ value: '06/06/2026' });
    });
    it('returns error for invalid date string', () => {
      expectError(coercion.Date.toApi('not-a-date'));
    });
    it('returns error for null', () => {
      expectError(coercion.Date.toApi(null));
    });
    it('returns error for undefined', () => {
      expectError(coercion.Date.toApi(undefined));
    });
  });
  describe('fromApi', () => {
    it('converts MM/DD/YYYY → ISO string', () => {
      expect(coercion.Date.fromApi('06/06/2026')).toBe('2026-06-06');
    });
    it('returns null for empty string', () => {
      expect(coercion.Date.fromApi('')).toBeNull();
    });
    it('returns null for null', () => {
      expect(coercion.Date.fromApi(null)).toBeNull();
    });
    it('returns null for undefined', () => {
      expect(coercion.Date.fromApi(undefined)).toBeNull();
    });
  });
});

// ===========================================================================
// DateTime
// ===========================================================================
describe('DateTime', () => {
  describe('toApi', () => {
    it('converts ISO datetime → MM/DD/YYYY HH:mm:ss', () => {
      expect(coercion.DateTime.toApi('2026-06-06T14:30:00')).toEqual({ value: '06/06/2026 14:30:00' });
    });
    it('converts ISO datetime with Z → MM/DD/YYYY HH:mm:ss (UTC)', () => {
      const result = coercion.DateTime.toApi('2026-06-06T00:00:00Z');
      expect(result).toHaveProperty('value');
      expect(result.value).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/);
    });
    it('passes through already-formatted MM/DD/YYYY HH:mm:ss', () => {
      expect(coercion.DateTime.toApi('06/06/2026 14:30:00')).toEqual({ value: '06/06/2026 14:30:00' });
    });
    it('returns error for invalid datetime string', () => {
      expectError(coercion.DateTime.toApi('not-a-date'));
    });
    it('returns error for null', () => {
      expectError(coercion.DateTime.toApi(null));
    });
  });
  describe('fromApi', () => {
    it('converts MM/DD/YYYY HH:mm:ss → ISO string', () => {
      expect(coercion.DateTime.fromApi('06/06/2026 14:30:00')).toBe('2026-06-06T14:30:00');
    });
    it('returns null for empty string', () => {
      expect(coercion.DateTime.fromApi('')).toBeNull();
    });
    it('returns null for null', () => {
      expect(coercion.DateTime.fromApi(null)).toBeNull();
    });
    it('returns null for undefined', () => {
      expect(coercion.DateTime.fromApi(undefined)).toBeNull();
    });
  });
});

// ===========================================================================
// Time
// ===========================================================================
describe('Time', () => {
  describe('toApi', () => {
    it('accepts HH:mm:ss', () => {
      expect(coercion.Time.toApi('14:30:00')).toEqual({ value: '14:30:00' });
    });
    it('accepts HH:mm and appends :00', () => {
      expect(coercion.Time.toApi('14:30')).toEqual({ value: '14:30:00' });
    });
    it('returns error for hour > 23', () => {
      expectError(coercion.Time.toApi('25:00:00'));
    });
    it('returns error for minute > 59', () => {
      expectError(coercion.Time.toApi('14:60:00'));
    });
    it('returns error for second > 59', () => {
      expectError(coercion.Time.toApi('14:30:60'));
    });
    it('returns error for non-time string', () => {
      expectError(coercion.Time.toApi('not-a-time'));
    });
    it('returns error for null', () => {
      expectError(coercion.Time.toApi(null));
    });
    it('returns error for undefined', () => {
      expectError(coercion.Time.toApi(undefined));
    });
  });
  describe('fromApi', () => {
    it('passes HH:mm:ss through', () => {
      expect(coercion.Time.fromApi('14:30:00')).toBe('14:30:00');
    });
    it('returns null for empty string', () => {
      expect(coercion.Time.fromApi('')).toBeNull();
    });
    it('returns null for null', () => {
      expect(coercion.Time.fromApi(null)).toBeNull();
    });
    it('returns null for undefined', () => {
      expect(coercion.Time.fromApi(undefined)).toBeNull();
    });
  });
});

// ===========================================================================
// Enum
// ===========================================================================
describe('Enum', () => {
  describe('toApi', () => {
    it('accepts non-empty string', () => {
      expect(coercion.Enum.toApi('Active')).toEqual({ value: 'Active' });
    });
    it('accepts number coerced to string', () => {
      expect(coercion.Enum.toApi(1)).toEqual({ value: '1' });
    });
    it('returns error for empty string', () => {
      expectError(coercion.Enum.toApi(''));
    });
    it('returns error for null', () => {
      expectError(coercion.Enum.toApi(null));
    });
    it('returns error for undefined', () => {
      expectError(coercion.Enum.toApi(undefined));
    });
  });
  describe('fromApi', () => {
    it('passes string through', () => {
      expect(coercion.Enum.fromApi('Active')).toBe('Active');
    });
    it('returns null for empty string', () => {
      expect(coercion.Enum.fromApi('')).toBeNull();
    });
    it('returns null for null', () => {
      expect(coercion.Enum.fromApi(null)).toBeNull();
    });
    it('returns null for undefined', () => {
      expect(coercion.Enum.fromApi(undefined)).toBeNull();
    });
  });
});

// ===========================================================================
// EnumList
// ===========================================================================
describe('EnumList', () => {
  describe('toApi', () => {
    it('converts array → "A , B , C"', () => {
      expect(coercion.EnumList.toApi(['A', 'B', 'C'])).toEqual({ value: 'A , B , C' });
    });
    it('handles single-item array', () => {
      expect(coercion.EnumList.toApi(['Only'])).toEqual({ value: 'Only' });
    });
    it('handles empty array', () => {
      expect(coercion.EnumList.toApi([])).toEqual({ value: '' });
    });
    it('converts comma-separated string → passes through (already formatted)', () => {
      expect(coercion.EnumList.toApi('A , B , C')).toEqual({ value: 'A , B , C' });
    });
    it('returns error for null', () => {
      expectError(coercion.EnumList.toApi(null));
    });
    it('returns error for undefined', () => {
      expectError(coercion.EnumList.toApi(undefined));
    });
    it('returns error for number', () => {
      expectError(coercion.EnumList.toApi(42));
    });
  });
  describe('fromApi', () => {
    it('splits "A , B , C" → ["A","B","C"]', () => {
      expect(coercion.EnumList.fromApi('A , B , C')).toEqual(['A', 'B', 'C']);
    });
    it('handles single value', () => {
      expect(coercion.EnumList.fromApi('Only')).toEqual(['Only']);
    });
    it('returns null for empty string', () => {
      expect(coercion.EnumList.fromApi('')).toBeNull();
    });
    it('returns null for null', () => {
      expect(coercion.EnumList.fromApi(null)).toBeNull();
    });
    it('returns null for undefined', () => {
      expect(coercion.EnumList.fromApi(undefined)).toBeNull();
    });
    it('passes through array unchanged', () => {
      expect(coercion.EnumList.fromApi(['A', 'B'])).toEqual(['A', 'B']);
    });
  });
});

// ===========================================================================
// Email
// ===========================================================================
describe('Email', () => {
  describe('toApi', () => {
    it('accepts valid email', () => {
      expect(coercion.Email.toApi('user@example.com')).toEqual({ value: 'user@example.com' });
    });
    it('returns error for string without @', () => {
      expectError(coercion.Email.toApi('notanemail'));
    });
    it('returns error for null', () => {
      expectError(coercion.Email.toApi(null));
    });
    it('returns error for undefined', () => {
      expectError(coercion.Email.toApi(undefined));
    });
    it('returns error for empty string', () => {
      expectError(coercion.Email.toApi(''));
    });
  });
  describe('fromApi', () => {
    it('passes email through', () => {
      expect(coercion.Email.fromApi('user@example.com')).toBe('user@example.com');
    });
    it('returns null for empty string', () => {
      expect(coercion.Email.fromApi('')).toBeNull();
    });
    it('returns null for null', () => {
      expect(coercion.Email.fromApi(null)).toBeNull();
    });
    it('returns null for undefined', () => {
      expect(coercion.Email.fromApi(undefined)).toBeNull();
    });
  });
});

// ===========================================================================
// LatLong
// ===========================================================================
describe('LatLong', () => {
  describe('toApi', () => {
    it('converts {lat, lng} object → "lat, lng"', () => {
      expect(coercion.LatLong.toApi({ lat: 37.7749, lng: -122.4194 })).toEqual({ value: '37.7749, -122.4194' });
    });
    it('handles {lat, lon} as alias', () => {
      expect(coercion.LatLong.toApi({ lat: 37.7749, lon: -122.4194 })).toEqual({ value: '37.7749, -122.4194' });
    });
    it('passes through already-formatted string', () => {
      expect(coercion.LatLong.toApi('37.7749, -122.4194')).toEqual({ value: '37.7749, -122.4194' });
    });
    it('returns error for object missing lat', () => {
      expectError(coercion.LatLong.toApi({ lng: -122 }));
    });
    it('returns error for object missing lng', () => {
      expectError(coercion.LatLong.toApi({ lat: 37 }));
    });
    it('returns error for null', () => {
      expectError(coercion.LatLong.toApi(null));
    });
    it('returns error for undefined', () => {
      expectError(coercion.LatLong.toApi(undefined));
    });
    it('returns error for invalid string', () => {
      expectError(coercion.LatLong.toApi('not-a-coord'));
    });
  });
  describe('fromApi', () => {
    it('parses "lat, lng" → {lat, lng}', () => {
      expect(coercion.LatLong.fromApi('37.7749, -122.4194')).toEqual({ lat: 37.7749, lng: -122.4194 });
    });
    it('returns null for empty string', () => {
      expect(coercion.LatLong.fromApi('')).toBeNull();
    });
    it('returns null for null', () => {
      expect(coercion.LatLong.fromApi(null)).toBeNull();
    });
    it('returns null for undefined', () => {
      expect(coercion.LatLong.fromApi(undefined)).toBeNull();
    });
  });
});

// ===========================================================================
// Passthrough types: Phone, URL, Image, Address, Ref
// ===========================================================================
const passthroughTypes = ['Phone', 'URL', 'Image', 'Address', 'Ref'];

passthroughTypes.forEach((typeName) => {
  describe(typeName, () => {
    describe('toApi', () => {
      it('wraps string in {value}', () => {
        expect(coercion[typeName].toApi('some-value')).toEqual({ value: 'some-value' });
      });
      it('coerces number to string', () => {
        expect(coercion[typeName].toApi(123)).toEqual({ value: '123' });
      });
      it('returns error for null', () => {
        expectError(coercion[typeName].toApi(null));
      });
      it('returns error for undefined', () => {
        expectError(coercion[typeName].toApi(undefined));
      });
    });
    describe('fromApi', () => {
      it('returns value unchanged', () => {
        expect(coercion[typeName].fromApi('some-value')).toBe('some-value');
      });
      it('returns null for empty string', () => {
        expect(coercion[typeName].fromApi('')).toBeNull();
      });
      it('returns null for null', () => {
        expect(coercion[typeName].fromApi(null)).toBeNull();
      });
      it('returns null for undefined', () => {
        expect(coercion[typeName].fromApi(undefined)).toBeNull();
      });
    });
  });
});
