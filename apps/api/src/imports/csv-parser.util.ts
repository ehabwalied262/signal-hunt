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
  email: string | null;
  website: string | null;
  personalLinkedin: string | null;
  companyLinkedin: string | null;
  industry: string | null;
  companyOverview: string | null;
  isOptOut: boolean;
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
  'organisation': 'companyName',

  // Contact Name
  'contact name': 'contactName',
  'contact': 'contactName',
  'contact_name': 'contactName',
  'contactname': 'contactName',
  'name': 'contactName',
  'full name': 'contactName',
  'full_name': 'contactName',
  'person': 'contactName',
  'prospect': 'contactName',
  'prospect name': 'contactName',
  'first name': 'contactName',
  'lead name': 'contactName',

  // Contact Title
  'contact title': 'contactTitle',
  'title': 'contactTitle',
  'contact_title': 'contactTitle',
  'job title': 'contactTitle',
  'job_title': 'contactTitle',
  'position': 'contactTitle',
  'role': 'contactTitle',
  'designation': 'contactTitle',
  'lead title': 'contactTitle',

  // Phone Number
  'phone number': 'phoneNumber',
  'phone': 'phoneNumber',
  'phone_number': 'phoneNumber',
  'phonenumber': 'phoneNumber',
  'mobile': 'phoneNumber',
  'telephone': 'phoneNumber',
  'direct phone': 'phoneNumber',
  'direct_phone': 'phoneNumber',
  'tel': 'phoneNumber',
  'cell': 'phoneNumber',
  'mobile phone': 'phoneNumber',
  'work phone': 'phoneNumber',

  // Country
  'country': 'country',
  'country_code': 'country',
  'country code': 'country',
  'nation': 'country',
  'company country': 'country',

  // Location
  'location': 'location',
  'city': 'location',
  'address': 'location',
  'hq location': 'location',
  'hq_location': 'location',
  'headquarters': 'location',
  'region': 'location',
  'lead location': 'location',
  'company location': 'country',

  // Headcount
  'headcount': 'headcount',
  'employees': 'headcount',
  'employee count': 'headcount',
  'employee_count': 'headcount',
  'company size': 'headcount',
  'size': 'headcount',
  '# employees': 'headcount',
  'num employees': 'headcount',
  'number of employees': 'headcount',
  'no. of employees': 'headcount',
  'staff': 'headcount',

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

  // Email
  'email': 'email',
  'email address': 'email',
  'email_address': 'email',
  'e-mail': 'email',
  'contact email': 'email',
  'work email': 'email',
  'business email': 'email',

  // Website
  'website': 'website',
  'web': 'website',
  'url': 'website',
  'company website': 'website',
  'company_website': 'website',
  'site': 'website',
  'homepage': 'website',
  'domain': 'website',

  // Personal LinkedIn
  'personal linkedin': 'personalLinkedin',
  'personal_linkedin': 'personalLinkedin',
  'linkedin': 'personalLinkedin',
  'linkedin url': 'personalLinkedin',
  'linkedin_url': 'personalLinkedin',
  'person linkedin': 'personalLinkedin',
  'contact linkedin': 'personalLinkedin',
  'linkedin profile': 'personalLinkedin',
  'lead linkedin': 'personalLinkedin',

  // Company LinkedIn
  'company linkedin': 'companyLinkedin',
  'company_linkedin': 'companyLinkedin',
  'company linkedin url': 'companyLinkedin',
  'organization linkedin': 'companyLinkedin',
  'company facebook': 'companyLinkedin',

  // Industry
  'industry': 'industry',
  'sector': 'industry',
  'vertical': 'industry',
  'market': 'industry',
  'business type': 'industry',
  'industries': 'industry',

  // Company Overview
  'company overview': 'companyOverview',
  'company_overview': 'companyOverview',
  'overview': 'companyOverview',
  'description': 'companyOverview',
  'about': 'companyOverview',
  'company description': 'companyOverview',
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

      // Normalize phone number (lenient — uses country context when available)
      const normalizedPhone = normalizePhoneNumber(row.phoneNumber, row.country);

      if (!normalizedPhone) {
        errors.push({
          row: rowNum,
          message: `Invalid phone number: "${row.phoneNumber}" (could not normalize)`,
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
    email: null,
    website: null,
    personalLinkedin: null,
    companyLinkedin: null,
    industry: null,
    companyOverview: null,
    isOptOut: false,
    rowIndex,
  };

  for (const [rawHeader, field] of Object.entries(headerMap)) {
    const value = raw[rawHeader];

    if (value === null || value === undefined || value === '' || value === '-') {
      continue;
    }

    switch (field) {
      case 'headcount':
        row.headcount = parseInt(String(value), 10) || null;
        break;
      case 'headcountGrowth6m':
      case 'headcountGrowth12m':
        row[field] = parseFloat(String(value).replace('%', '').trim()) || null;
        break;
      case 'country':
        // Normalize full country names to ISO codes (e.g. "United Kingdom" → "GB")
        row.country = normalizeCountry(String(value).trim());
        break;
      default:
        (row as any)[field] = String(value).trim();
    }
  }

  return row;
}

/**
 * Full country name → ISO 2-letter code.
 * Handles values like "United Kingdom", "Germany", "France" from CSV exports.
 */
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  'united kingdom': 'GB', 'uk': 'GB', 'great britain': 'GB', 'england': 'GB',
  'germany': 'DE', 'deutschland': 'DE',
  'netherlands': 'NL', 'the netherlands': 'NL', 'holland': 'NL',
  'france': 'FR',
  'spain': 'ES', 'españa': 'ES',
  'italy': 'IT', 'italia': 'IT',
  'belgium': 'BE', 'belgique': 'BE',
  'austria': 'AT', 'österreich': 'AT',
  'switzerland': 'CH', 'schweiz': 'CH',
  'sweden': 'SE', 'sverige': 'SE',
  'norway': 'NO', 'norge': 'NO',
  'denmark': 'DK', 'danmark': 'DK',
  'finland': 'FI', 'suomi': 'FI',
  'poland': 'PL', 'polska': 'PL',
  'portugal': 'PT',
  'ireland': 'IE', 'republic of ireland': 'IE',
  'czech republic': 'CZ', 'czechia': 'CZ',
  'romania': 'RO', 'românia': 'RO',
  'hungary': 'HU', 'magyarország': 'HU',
  'egypt': 'EG',
  'united states': 'US', 'usa': 'US', 'united states of america': 'US',
  'canada': 'CA',
  'australia': 'AU',
  'india': 'IN',
  'united arab emirates': 'AE', 'uae': 'AE',
  'saudi arabia': 'SA',
};

/**
 * Normalize a country value to ISO 2-letter code.
 * Accepts both full names ("United Kingdom") and codes ("GB").
 */
function normalizeCountry(value: string): string {
  const lower = value.toLowerCase().trim();
  // Already a 2-letter ISO code
  if (/^[a-z]{2}$/.test(lower)) return value.toUpperCase();
  return COUNTRY_NAME_TO_ISO[lower] || value;
}

/**
 * Country code map for common European + global countries.
 */
const COUNTRY_DIAL_CODES: Record<string, string> = {
  'GB': '44', 'UK': '44',
  'DE': '49',
  'NL': '31',
  'FR': '33',
  'ES': '34',
  'IT': '39',
  'BE': '32',
  'AT': '43',
  'CH': '41',
  'SE': '46',
  'NO': '47',
  'DK': '45',
  'FI': '358',
  'PL': '48',
  'PT': '351',
  'IE': '353',
  'CZ': '420',
  'RO': '40',
  'HU': '36',
  'EG': '20',
  'US': '1',
  'CA': '1',
  'AU': '61',
  'IN': '91',
  'AE': '971',
  'SA': '966',
};

/**
 * Normalize phone numbers to E.164 format.
 *
 * Lenient approach — tries multiple strategies:
 *   1. Already E.164 (+countrydigits)
 *   2. Starts with 00 (international prefix)
 *   3. Country-specific local formats (e.g. 07xxx in GB, 0xxx in most EU)
 *   4. Raw digits with valid length
 */
function normalizePhoneNumber(phone: string, country: string | null): string | null {
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

  // If starts with a valid country code and has enough digits, add +
  if (/^[1-9]\d{7,14}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // Try to use country context for local numbers starting with 0
  if (cleaned.startsWith('0') && country) {
    const countryUpper = country.toUpperCase().trim();
    const dialCode = COUNTRY_DIAL_CODES[countryUpper];

    if (dialCode) {
      const localNumber = cleaned.substring(1); // strip leading 0
      const international = `+${dialCode}${localNumber}`;

      if (/^\+[1-9]\d{6,14}$/.test(international)) {
        return international;
      }
    }
  }

  // Last resort: if we have 7+ digits, keep it with a + prefix
  if (/^\d{7,15}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  return null;
}
