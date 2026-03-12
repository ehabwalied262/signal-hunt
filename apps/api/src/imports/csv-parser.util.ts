import * as XLSX from 'xlsx';

/**
 * Normalized lead row from CSV/Excel import.
 * Field names are standardized regardless of the input column headers.
 */
export interface ParsedLeadRow {
  companyName: string;
  contactName: string | null;
  contactTitle: string | null;
  phoneNumber: string;
  country: string | null;
  location: string | null;
  headcount: number | null;
  headcountGrowth6m: number | null;
  headcountGrowth12m: number | null;
  companyOverview: string | null;
  rowIndex: number; // Original row number for error reporting
}

export interface ParseResult {
  rows: ParsedLeadRow[];
  errors: Array<{ row: number; message: string }>;
  totalRows: number;
}

/**
 * Column name mapping — maps various possible CSV header names
 * to our standard field names. Case-insensitive.
 */
const COLUMN_MAP: Record<string, keyof ParsedLeadRow> = {
  // Company Name
  'company name': 'companyName',
  'company': 'companyName',
  'company_name': 'companyName',
  'companyname': 'companyName',
  'organization': 'companyName',

  // Contact Name
  'contact name': 'contactName',
  'contact': 'contactName',
  'contact_name': 'contactName',
  'contactname': 'contactName',
  'name': 'contactName',
  'full name': 'contactName',
  'full_name': 'contactName',

  // Contact Title
  'contact title': 'contactTitle',
  'title': 'contactTitle',
  'contact_title': 'contactTitle',
  'job title': 'contactTitle',
  'job_title': 'contactTitle',
  'position': 'contactTitle',

  // Phone Number
  'phone number': 'phoneNumber',
  'phone': 'phoneNumber',
  'phone_number': 'phoneNumber',
  'phonenumber': 'phoneNumber',
  'mobile': 'phoneNumber',
  'telephone': 'phoneNumber',
  'direct phone': 'phoneNumber',

  // Country
  'country': 'country',
  'country_code': 'country',

  // Location
  'location': 'location',
  'city': 'location',
  'address': 'location',
  'hq location': 'location',

  // Headcount
  'headcount': 'headcount',
  'employees': 'headcount',
  'employee count': 'headcount',
  'employee_count': 'headcount',
  'company size': 'headcount',
  'size': 'headcount',
  '# employees': 'headcount',

  // Growth rates
  'headcount growth 6m': 'headcountGrowth6m',
  'headcount_growth_6m': 'headcountGrowth6m',
  'growth 6m': 'headcountGrowth6m',
  '6 month growth': 'headcountGrowth6m',
  '6m growth': 'headcountGrowth6m',

  'headcount growth 12m': 'headcountGrowth12m',
  'headcount_growth_12m': 'headcountGrowth12m',
  'growth 12m': 'headcountGrowth12m',
  '12 month growth': 'headcountGrowth12m',
  '12m growth': 'headcountGrowth12m',

  // Company Overview
  'company overview': 'companyOverview',
  'company_overview': 'companyOverview',
  'overview': 'companyOverview',
  'description': 'companyOverview',
  'about': 'companyOverview',
};

/**
 * Parse a CSV or Excel file buffer into normalized lead rows.
 */
export function parseLeadFile(buffer: Buffer, filename: string): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  // Use first sheet
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], errors: [{ row: 0, message: 'File contains no sheets' }], totalRows: 0 };
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
  });

  if (rawRows.length === 0) {
    return { rows: [], errors: [{ row: 0, message: 'File contains no data rows' }], totalRows: 0 };
  }

  // Build header mapping
  const rawHeaders = Object.keys(rawRows[0]);
  const headerMap: Record<string, keyof ParsedLeadRow> = {};

  for (const rawHeader of rawHeaders) {
    const normalized = rawHeader.toLowerCase().trim();
    if (COLUMN_MAP[normalized]) {
      headerMap[rawHeader] = COLUMN_MAP[normalized];
    }
  }

  // Validate required columns exist
  const mappedFields = Object.values(headerMap);
  if (!mappedFields.includes('companyName')) {
    return {
      rows: [],
      errors: [{ row: 0, message: 'Missing required column: Company Name' }],
      totalRows: rawRows.length,
    };
  }
  if (!mappedFields.includes('phoneNumber')) {
    return {
      rows: [],
      errors: [{ row: 0, message: 'Missing required column: Phone Number' }],
      totalRows: rawRows.length,
    };
  }

  // Parse rows
  const rows: ParsedLeadRow[] = [];
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < rawRows.length; i++) {
    const rawRow = rawRows[i];
    const rowNum = i + 2; // +2 for header row + 0-indexed

    try {
      const row = mapRow(rawRow, headerMap, rowNum);

      // Validate required fields
      if (!row.companyName || row.companyName.trim() === '') {
        errors.push({ row: rowNum, message: 'Missing company name' });
        continue;
      }

      if (!row.phoneNumber || row.phoneNumber.trim() === '') {
        errors.push({ row: rowNum, message: 'Missing phone number' });
        continue;
      }

      // Normalize phone number
      const normalizedPhone = normalizePhoneNumber(row.phoneNumber);

      if (!normalizedPhone) {
        errors.push({
          row: rowNum,
          message: 'Invalid phone number format (must be E.164 or include country code)',
        });
        continue;
      }

      row.phoneNumber = normalizedPhone;
      rows.push(row);
    } catch (err) {
      errors.push({ row: rowNum, message: `Failed to parse row: ${err}` });
    }
  }

  return { rows, errors, totalRows: rawRows.length };
}

function mapRow(
  raw: Record<string, any>,
  headerMap: Record<string, keyof ParsedLeadRow>,
  rowIndex: number,
): ParsedLeadRow {
  const row: ParsedLeadRow = {
    companyName: '',
    contactName: null,
    contactTitle: null,
    phoneNumber: '',
    country: null,
    location: null,
    headcount: null,
    headcountGrowth6m: null,
    headcountGrowth12m: null,
    companyOverview: null,
    rowIndex,
  };

  for (const [rawHeader, field] of Object.entries(headerMap)) {
    const value = raw[rawHeader];

    if (value === null || value === undefined || value === '') {
      continue;
    }

    switch (field) {
      case 'headcount':
        row.headcount = parseInt(String(value), 10) || null;
        break;
      case 'headcountGrowth6m':
      case 'headcountGrowth12m':
        row[field] = parseFloat(String(value)) || null;
        break;
      default:
        (row as any)[field] = String(value).trim();
    }
  }

  return row;
}

/**
 * Normalize phone numbers to E.164 format.
 * Handles common formats: +44..., 0044..., 44..., 07...
 */
function normalizePhoneNumber(phone: string): string | null {
  // Strip all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Already E.164
  if (/^\+[1-9]\d{6,14}$/.test(cleaned)) {
    return cleaned;
  }

  // Has + but doesn't match — strip and retry
  cleaned = cleaned.replace(/^\+/, '');

  // Starts with 00 (international prefix)
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  // If starts with a valid country code length number, add +
  if (/^[1-9]\d{7,14}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  return null;
}
