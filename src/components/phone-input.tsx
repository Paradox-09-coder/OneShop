"use client";

import type { ClipboardEvent, InputHTMLAttributes } from "react";

// Telefon raqami maydoni:
//  • bo'sh bo'lsa ham "+998" ko'rinib turadi (O'zbekiston kodi — odatiy holat);
//    foydalanuvchi shunga davom ettirib yozadi, xohlasa butunlay o'zgartira oladi;
//  • faqat raqam qabul qiladi (harf va belgilar tashlab yuboriladi);
//  • "+998 90 123 45 67" ko'rinishida guruhlab turadi;
//  • faqat "+998" qolsa (hech narsa kiritilmagan) tashqariga "" qaytaradi,
//    shunda "bo'sh telefon" bazaga "+998" bo'lib tushib qolmaydi.

const UZ = "+998";

export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 15);
  if (!digits) return "";
  if (digits.startsWith("998")) {
    const r = digits.slice(3);
    const parts = [r.slice(0, 2), r.slice(2, 5), r.slice(5, 7), r.slice(7, 9)].filter(Boolean);
    return [UZ, ...parts].join(" ");
  }
  // Boshqa davlat raqami — guruhlamasdan, "+" va raqamlar
  return "+" + digits;
}

interface Props
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: string;
  onChange: (value: string) => void;
}

export default function PhoneInput({ value, onChange, placeholder, ...rest }: Props) {
  const emit = (raw: string) => {
    const f = formatPhone(raw);
    onChange(f === UZ ? "" : f);
  };

  // 9 xonali mahalliy raqam qo'yilsa (masalan "90 123 45 67") — +998 o'zi qo'shiladi
  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "");
    if (digits.length === 9) {
      e.preventDefault();
      emit(UZ + digits);
    }
  }

  return (
    <input
      {...rest}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={value === "" ? UZ : value}
      onChange={(e) => emit(e.target.value)}
      onPaste={onPaste}
      placeholder={placeholder ?? "+998 90 123 45 67"}
    />
  );
}
