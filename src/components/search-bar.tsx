"use client";

import { Search } from "lucide-react";

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ placeholder = "Поиск...", value, onChange }: SearchBarProps) {
  return (
    <div className="relative w-full">
      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-11 pr-16 py-3 bg-panel border border-border rounded-2xl text-sm placeholder:text-ink-soft/60"
      />
      <kbd className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-ink-soft bg-gray-100 px-2 py-0.5 rounded-md font-mono">
        ⌘K
      </kbd>
    </div>
  );
}
