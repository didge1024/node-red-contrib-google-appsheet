'use strict';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when a value is null or undefined.
 */
function isNullish(val) {
  return val === null || val === undefined;
}

/**
 * Shared null-guard for fromApi: returns null when the value is
 * null, undefined, or an empty string.
 */
function fromApiNullGuard(val) {
  if (isNullish(val)) return null;
  if (val === '') return null;
  return undefined; // sentinel: caller should continue
}

/**
 * Parse a value as a finite number for Number / Price / Percent.
 * Returns { value: number } on success, { error: string } on failure.
 */
function parseNumeric(val, typeName) {
  if (isNullish(val)) {
    return { error: `Cannot convert ${JSON.stringify(val)} to ${typeName}` };
  }
  if (typeof val === 'object') {
    return { error: `Cannot convert ${JSON.stringify(val)} to ${typeName}` };
  }
  if (val === '') {
    return { error: `Cannot convert "" to ${typeName}` };
  }
  const n = Number(val);
  if (!Number.isFinite(n)) {
    return { error: `Cannot convert ${JSON.stringify(String(val))} to ${typeName}` };
  }
  return { value: n };
}

/**
 * Parse date parts from a variety of inputs.
 * Accepts:
 *   - ISO date:     "YYYY-MM-DD"
 *   - ISO datetime: "YYYY-MM-DDTHH:mm:ss" (local, no Z)
 *   - ISO with Z:   "YYYY-MM-DDTHH:mm:ssZ" (UTC)
 *   - AppSheet:     "MM/DD/YYYY" or "MM/DD/YYYY HH:mm:ss"
 *   - Date object
 *
 * Returns { year, month, day, hour, minute, second } (all strings, zero-padded)
 * or null on failure.
 *
 * hour/minute/second default to '00' for date-only inputs.
 */
function parseDateParts(val) {
  if (isNullish(val)) return null;

  // Date object — use local time so the caller controls UTC vs local
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const year   = String(val.getFullYear());
    const month  = String(val.getMonth() + 1).padStart(2, '0');
    const day    = String(val.getDate()).padStart(2, '0');
    const hour   = String(val.getHours()).padStart(2, '0');
    const minute = String(val.getMinutes()).padStart(2, '0');
    const second = String(val.getSeconds()).padStart(2, '0');
    return { year, month, day, hour, minute, second };
  }

  const s = String(val).trim();

  // AppSheet format: MM/DD/YYYY or MM/DD/YYYY HH:mm:ss
  const appsheetDateRe = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/;
  const asMatch = s.match(appsheetDateRe);
  if (asMatch) {
    return {
      month:  asMatch[1],
      day:    asMatch[2],
      year:   asMatch[3],
      hour:   asMatch[4] || '00',
      minute: asMatch[5] || '00',
      second: asMatch[6] || '00',
    };
  }

  // ISO datetime with Z (UTC): YYYY-MM-DDTHH:mm:ssZ or YYYY-MM-DDTHH:mm:ss.mssZ
  const isoZRe = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/;
  const isoZMatch = s.match(isoZRe);
  if (isoZMatch) {
    // Parse as a Date so JS handles UTC → local conversion
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return {
      year:   String(d.getFullYear()),
      month:  String(d.getMonth() + 1).padStart(2, '0'),
      day:    String(d.getDate()).padStart(2, '0'),
      hour:   String(d.getHours()).padStart(2, '0'),
      minute: String(d.getMinutes()).padStart(2, '0'),
      second: String(d.getSeconds()).padStart(2, '0'),
    };
  }

  // ISO datetime without Z (local): YYYY-MM-DDTHH:mm:ss
  const isoLocalRe = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?$/;
  const isoLocalMatch = s.match(isoLocalRe);
  if (isoLocalMatch) {
    return {
      year:   isoLocalMatch[1],
      month:  isoLocalMatch[2],
      day:    isoLocalMatch[3],
      hour:   isoLocalMatch[4],
      minute: isoLocalMatch[5],
      second: isoLocalMatch[6],
    };
  }

  // ISO date only: YYYY-MM-DD
  const isoDateRe = /^(\d{4})-(\d{2})-(\d{2})$/;
  const isoDateMatch = s.match(isoDateRe);
  if (isoDateMatch) {
    return {
      year:   isoDateMatch[1],
      month:  isoDateMatch[2],
      day:    isoDateMatch[3],
      hour:   '00',
      minute: '00',
      second: '00',
    };
  }

  return null;
}

/**
 * Factory for passthrough types (Phone, URL, Image, Address, Ref).
 * toApi: wraps non-null value as String in { value }
 * fromApi: returns value as-is, null for empty/null/undefined
 */
function passthrough(typeName) {
  return {
    toApi(val) {
      if (isNullish(val)) {
        return { error: `${typeName} value is required` };
      }
      return { value: String(val) };
    },
    fromApi(val) {
      const guard = fromApiNullGuard(val);
      if (guard !== undefined) return guard;
      return val;
    },
  };
}

// ---------------------------------------------------------------------------
// Type implementations
// ---------------------------------------------------------------------------

const Text = {
  toApi(val) {
    if (isNullish(val)) {
      return { error: 'Text value is required' };
    }
    return { value: String(val) };
  },
  fromApi(val) {
    const guard = fromApiNullGuard(val);
    if (guard !== undefined) return guard;
    return val;
  },
};

const NumberType = {
  toApi(val) {
    return parseNumeric(val, 'Number');
  },
  fromApi(val) {
    const guard = fromApiNullGuard(val);
    if (guard !== undefined) return guard;
    return parseFloat(val);
  },
};

const Price = {
  toApi(val) {
    return parseNumeric(val, 'Price');
  },
  fromApi(val) {
    const guard = fromApiNullGuard(val);
    if (guard !== undefined) return guard;
    return parseFloat(val);
  },
};

const Percent = {
  toApi(val) {
    const result = parseNumeric(val, 'Percent');
    if (result.error) return result;
    const n = result.value;
    if (n < 0 || n > 1) {
      const suggestion = (n / 100).toFixed(4).replace(/\.?0+$/, '');
      return {
        error: `Percent value ${n} is out of range [0, 1]. Did you mean ${suggestion}?`,
      };
    }
    return { value: n };
  },
  fromApi(val) {
    const guard = fromApiNullGuard(val);
    if (guard !== undefined) return guard;
    return parseFloat(val);
  },
};

const TRUTHY_STRINGS  = new Set(['yes', 'true', '1', 'y']);
const FALSY_STRINGS   = new Set(['no', 'false', '0', 'n']);

const YesNo = {
  toApi(val) {
    if (isNullish(val)) return { error: 'Yes/No value is required' };
    if (typeof val === 'boolean') return { value: val ? 'Y' : 'N' };
    const s = String(val).toLowerCase();
    if (TRUTHY_STRINGS.has(s)) return { value: 'Y' };
    if (FALSY_STRINGS.has(s))  return { value: 'N' };
    return { error: `Cannot convert "${val}" to Yes/No` };
  },
  fromApi(val) {
    const guard = fromApiNullGuard(val);
    if (guard !== undefined) return guard;
    const s = String(val).toLowerCase();
    if (TRUTHY_STRINGS.has(s)) return true;
    if (FALSY_STRINGS.has(s))  return false;
    return null;
  },
};

const DateType = {
  toApi(val) {
    if (isNullish(val)) return { error: 'Date value is required' };
    const parts = parseDateParts(val);
    if (!parts) return { error: `Cannot convert "${val}" to Date` };
    return { value: `${parts.month}/${parts.day}/${parts.year}` };
  },
  fromApi(val) {
    const guard = fromApiNullGuard(val);
    if (guard !== undefined) return guard;
    const parts = parseDateParts(val);
    if (!parts) return null;
    return `${parts.year}-${parts.month}-${parts.day}`;
  },
};

const DateTime = {
  toApi(val) {
    if (isNullish(val)) return { error: 'DateTime value is required' };
    const parts = parseDateParts(val);
    if (!parts) return { error: `Cannot convert "${val}" to DateTime` };
    return { value: `${parts.month}/${parts.day}/${parts.year} ${parts.hour}:${parts.minute}:${parts.second}` };
  },
  fromApi(val) {
    const guard = fromApiNullGuard(val);
    if (guard !== undefined) return guard;
    const parts = parseDateParts(val);
    if (!parts) return null;
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
  },
};

const TIME_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

const Time = {
  toApi(val) {
    if (isNullish(val)) return { error: 'Time value is required' };
    const m = String(val).match(TIME_RE);
    if (!m) return { error: `Cannot convert "${val}" to Time` };
    const h  = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const sec = m[3] !== undefined ? parseInt(m[3], 10) : 0;
    if (h > 23)   return { error: `Invalid time "${val}": hour ${h} out of range` };
    if (min > 59) return { error: `Invalid time "${val}": minute ${min} out of range` };
    if (sec > 59) return { error: `Invalid time "${val}": second ${sec} out of range` };
    const hh  = String(h).padStart(2, '0');
    const mm  = String(min).padStart(2, '0');
    const ss  = String(sec).padStart(2, '0');
    return { value: `${hh}:${mm}:${ss}` };
  },
  fromApi(val) {
    const guard = fromApiNullGuard(val);
    if (guard !== undefined) return guard;
    return val;
  },
};

const Enum = {
  toApi(val) {
    if (isNullish(val) || val === '') return { error: 'Enum value must be a non-empty string' };
    return { value: String(val) };
  },
  fromApi(val) {
    const guard = fromApiNullGuard(val);
    if (guard !== undefined) return guard;
    return val;
  },
};

const EnumList = {
  toApi(val) {
    if (isNullish(val)) return { error: 'EnumList value is required' };
    if (Array.isArray(val)) {
      return { value: val.join(' , ') };
    }
    if (typeof val === 'string') {
      return { value: val };
    }
    return { error: `Cannot convert ${JSON.stringify(val)} to EnumList` };
  },
  fromApi(val) {
    const guard = fromApiNullGuard(val);
    if (guard !== undefined) return guard;
    if (Array.isArray(val)) return val;
    // Split on " , " (space-comma-space)
    return String(val)
      .split(' , ')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  },
};

const Email = {
  toApi(val) {
    if (isNullish(val) || val === '') return { error: 'Email value is required' };
    const s = String(val);
    if (!s.includes('@')) return { error: `"${s}" is not a valid Email address` };
    return { value: s };
  },
  fromApi(val) {
    const guard = fromApiNullGuard(val);
    if (guard !== undefined) return guard;
    return val;
  },
};

const LATLNG_STRING_RE = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/;

const LatLong = {
  toApi(val) {
    if (isNullish(val)) return { error: 'LatLong value is required' };
    if (typeof val === 'object' && !Array.isArray(val)) {
      const lat = val.lat;
      const lng = val.lng !== undefined ? val.lng : val.lon;
      if (lat === undefined) return { error: 'LatLong object missing "lat" property' };
      if (lng === undefined) return { error: 'LatLong object missing "lng" property' };
      return { value: `${lat}, ${lng}` };
    }
    if (typeof val === 'string') {
      const m = val.match(LATLNG_STRING_RE);
      if (!m) return { error: `Cannot convert "${val}" to LatLong` };
      return { value: val.trim() };
    }
    return { error: `Cannot convert ${JSON.stringify(val)} to LatLong` };
  },
  fromApi(val) {
    const guard = fromApiNullGuard(val);
    if (guard !== undefined) return guard;
    const m = String(val).match(LATLNG_STRING_RE);
    if (!m) return null;
    return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  },
};

// ---------------------------------------------------------------------------
// Exports — exact key names required by spec
// ---------------------------------------------------------------------------
module.exports = {
  Text,
  Number: NumberType,
  Price,
  Percent,
  'Yes/No': YesNo,
  Date: DateType,
  DateTime,
  Time,
  Enum,
  EnumList,
  Email,
  LatLong,
  Phone:   passthrough('Phone'),
  URL:     passthrough('URL'),
  Image:   passthrough('Image'),
  Address: passthrough('Address'),
  Ref:     passthrough('Ref'),
};
