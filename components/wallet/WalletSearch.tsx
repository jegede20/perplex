'use client';

import { useCallback, useState, type FormEvent } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { isValidAddress } from '@/lib/utils/format';

export interface WalletSearchProps {
  onSearch: (address: string) => void;
  placeholder?: string;
  large?: boolean;
}

/** Address search bar with EVM validation (0x + 40 hex chars). */
export default function WalletSearch({
  onSearch,
  placeholder = 'Enter any wallet address (0x...)',
  large = false,
}: WalletSearchProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (!isValidAddress(trimmed)) {
        setError('Invalid address — expected 0x followed by 40 hex characters');
        return;
      }
      setError(null);
      onSearch(trimmed.toLowerCase());
    },
    [value, onSearch]
  );

  return (
    <form onSubmit={handleSubmit} className="w-full" role="search">
      <div
        className={`flex items-center gap-2 rounded-xl border bg-surface2 px-3 transition-colors duration-150 focus-within:border-primary ${
          error ? 'border-danger' : 'border-border'
        } ${large ? 'h-12' : 'h-9'}`}
      >
        <Search size={large ? 18 : 15} className="shrink-0 text-textMuted" aria-hidden />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder={placeholder}
          aria-label="Wallet address"
          className={`w-full bg-transparent text-textPrimary placeholder:text-textMuted focus:outline-none ${
            large ? 'text-[15px]' : 'text-[13px]'
          }`}
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="submit"
          className={`shrink-0 rounded-lg bg-primary font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${
            large ? 'px-5 py-2 text-[14px]' : 'px-3 py-1.5 text-[12px]'
          }`}
        >
          Inspect
        </button>
      </div>
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-danger" role="alert">
          <AlertCircle size={12} aria-hidden /> {error}
        </p>
      )}
    </form>
  );
}
