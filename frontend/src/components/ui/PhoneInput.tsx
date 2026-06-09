import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { parsePhoneNumberFromString, getCountryCallingCode } from 'libphonenumber-js';
import type { CountryCode } from 'libphonenumber-js';

// ---------------------------------------------------------------------------
// Country data — major countries with flag emoji + dial code
// ---------------------------------------------------------------------------
interface Country {
  code: CountryCode;
  name: string;
  dialCode: string;
  flag: string;
}

function flagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

const COUNTRY_CODES: CountryCode[] = [
  'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'PT', 'NL',
  'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'RO',
  'HU', 'GR', 'BG', 'HR', 'SK', 'SI', 'LT', 'LV', 'EE', 'IE',
  'BR', 'MX', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'UY', 'PY',
  'BO', 'CR', 'PA', 'GT', 'HN', 'SV', 'NI', 'DO', 'CU',
  'IN', 'PK', 'BD', 'LK', 'NP', 'MM', 'TH', 'VN', 'PH', 'MY',
  'SG', 'ID', 'KH', 'LA', 'BN', 'TL',
  'CN', 'JP', 'KR', 'TW', 'HK', 'MO',
  'TR', 'SA', 'AE', 'IL', 'IQ', 'IR', 'JO', 'LB', 'KW', 'QA',
  'BH', 'OM', 'YE', 'SY', 'PS',
  'NG', 'ZA', 'KE', 'EG', 'GH', 'TZ', 'ET', 'UG', 'MZ', 'ZM',
  'ZW', 'BW', 'NA', 'MW', 'RW', 'SN', 'CI', 'CM', 'ML', 'BF',
  'NE', 'TD', 'MG', 'MU', 'SC',
  'RU', 'UA', 'KZ', 'UZ', 'TM', 'KG', 'TJ', 'GE', 'AM', 'AZ',
  'BY', 'MD',
  'NZ', 'FJ', 'PG', 'WS', 'TO', 'VU',
];

const COUNTRIES: Country[] = COUNTRY_CODES.map((code) => ({
  code,
  name: new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code,
  dialCode: `+${getCountryCallingCode(code)}`,
  flag: flagEmoji(code),
})).sort((a, b) => a.name.localeCompare(b.name));

// Group by dial code — keep first entry for duplicates (e.g. +1 for US/CA)
const DIAL_CODE_MAP = new Map<string, Country>();
for (const c of COUNTRIES) {
  if (!DIAL_CODE_MAP.has(c.dialCode)) {
    DIAL_CODE_MAP.set(c.dialCode, c);
  }
}

// ---------------------------------------------------------------------------
// Phone formatting helper
// ---------------------------------------------------------------------------
function formatNational(input: string, country?: CountryCode): string {
  if (!input) return '';
  // If starts with +, try to parse internationally
  if (input.startsWith('+')) {
    const parsed = parsePhoneNumberFromString(input);
    if (parsed) {
      // Strip leading trunk prefix (0) — E.164 never has it
      const national = parsed.formatNational();
      return national.replace(/^0\s*/, '');
    }
    return input;
  }
  // Otherwise try with default country
  if (country) {
    const parsed = parsePhoneNumberFromString(input, country);
    if (parsed) {
      const national = parsed.formatNational();
      return national.replace(/^0\s*/, '');
    }
  }
  return input;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface PhoneInputProps {
  value: string;                        // E.164 format (+14155552671) or raw
  onChange: (e164: string) => void;      // Called with E.164 or raw input
  defaultCountry?: CountryCode;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  required?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function PhoneInput({
  value,
  onChange,
  defaultCountry = 'US',
  placeholder = 'Phone number',
  disabled = false,
  error = false,
  className = '',
  required = false,
}: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    () => COUNTRIES.find((c) => c.code === defaultCountry) || COUNTRIES[0]
  );
  // Initialize display value from initial value on mount only
  const [displayValue, setDisplayValue] = useState(() => {
    if (!value) return '';
    // Don't reformat — just show the raw value as-is
    return value;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  // Filtered countries
  const filtered = useMemo(() => {
    if (!search) return COUNTRIES;
    const q = search.toLowerCase();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [search]);

  // Handle country select
  const handleSelectCountry = useCallback((country: Country) => {
    setSelectedCountry(country);
    setOpen(false);
    setSearch('');

    // Re-build E.164 from existing digits + new country dial code
    if (displayValue) {
      const digits = displayValue.replace(/[^\d]/g, '');
      if (digits) {
        // Strip any leading zeros (trunk prefix) — E.164 never has them
        const national = digits.replace(/^0+/, '') || digits;
        onChange(`${country.dialCode}${national}`);
      }
    } else {
      onChange('');
    }
  }, [displayValue, onChange]);

  // Handle typing
  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayValue(raw);

    // Try to build E.164
    const digits = raw.replace(/[^\d+]/g, '');
    if (!digits) {
      onChange('');
      return;
    }

    // If user typed a + prefix, try international parse
    if (digits.startsWith('+')) {
      const parsed = parsePhoneNumberFromString(digits);
      if (parsed?.isValid()) {
        onChange(parsed.number);
        return;
      }
      onChange(digits);
      return;
    }

    // Otherwise parse with selected country
    try {
      const parsed = parsePhoneNumberFromString(digits, selectedCountry.code);
      if (parsed?.isValid()) {
        onChange(parsed.number);
        return;
      }
    } catch { /* fall through */ }

    // Fallback: build E.164 from dial code + digits
    const national = digits.replace(/^0+/, '');
    onChange(`${selectedCountry.dialCode}${national}`);
  }, [selectedCountry, onChange]);

  const isValid = useMemo(() => {
    if (!value) return false;
    try {
      const parsed = parsePhoneNumberFromString(value);
      return parsed?.isValid() ?? false;
    } catch {
      return false;
    }
  }, [value]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        className={`
          flex items-center bg-zinc-800 border rounded-xl overflow-hidden transition-all
          ${error ? 'border-red-500/50' : 'border-white/10 focus-within:border-green-500/50'}
          ${disabled ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        {/* Country selector button */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700/50 transition-colors border-r border-white/10 min-w-[90px]"
        >
          <span className="text-base leading-none">{selectedCountry.flag}</span>
          <span className="text-xs text-zinc-400 font-mono">{selectedCountry.dialCode}</span>
          <ChevronDown size={12} className={`text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Phone number input */}
        <input
          ref={inputRef}
          type="tel"
          value={displayValue}
          onChange={handleInput}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="flex-1 bg-transparent px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none font-mono"
        />

        {/* Validation indicator */}
        {value && (
          <span className={`pr-3 text-xs ${isValid ? 'text-emerald-400' : 'text-zinc-600'}`}>
            {isValid ? (
              <Check size={14} className="text-emerald-400" />
            ) : null}
          </span>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-white/5">
            <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
              <Search size={14} className="text-zinc-500" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country..."
                className="bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none w-full"
              />
            </div>
          </div>

          {/* Country list */}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-zinc-500 text-center">No countries found</div>
            ) : (
              filtered.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleSelectCountry(country)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors
                    ${selectedCountry.code === country.code
                      ? 'bg-green-500/10 text-green-400'
                      : 'text-zinc-300 hover:bg-zinc-800'}
                  `}
                >
                  <span className="text-base leading-none">{country.flag}</span>
                  <span className="flex-1 truncate">{country.name}</span>
                  <span className="text-xs text-zinc-500 font-mono">{country.dialCode}</span>
                  {selectedCountry.code === country.code && (
                    <Check size={14} className="text-green-400" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
