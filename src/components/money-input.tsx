"use client";

// Katta summa kiritiladigan joylarda (ko'chirish, tranzaksiya, avans...)
// necha pul ekanini tez ilg'ab olish qiyin bo'lganidan — 1 000 000 va
// 10 000 000 bir-biridan ajralib turishi uchun raqamlar yozilayotganda
// ham ming ajratuvchi bo'shliq bilan ko'rsatiladi. Qiymatning o'zi (raw)
// xom raqamli string sifatida saqlanadi — formatlash faqat ko'rinishda.
function groupDigits(digits: string): string {
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

interface MoneyInputProps {
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export default function MoneyInput({
  value,
  onChange,
  placeholder,
  className,
  autoFocus,
}: MoneyInputProps) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={groupDigits(value)}
      onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
      onFocus={(e) => e.currentTarget.select()}
      placeholder={placeholder}
      className={className}
      autoFocus={autoFocus}
    />
  );
}
