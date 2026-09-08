"use client";

import { useState } from "react";
import Button from "@/components/button";
import Tabs from "@/components/tabs";
import { Package, Layers, History, Download as DownloadIcon } from "lucide-react";

const sections = [
  {
    group: "СКЛАД",
    items: [
      { id: "raw", label: "Сырьё", icon: Layers, count: 289 },
      { id: "finished", label: "Готовая продукция", icon: Package, count: 45 },
    ],
  },
  {
    group: "ПРОИЗВОДСТВО",
    items: [
      { id: "history", label: "История обработки", icon: History, count: 1200 },
      { id: "receiving", label: "Приёмка", icon: DownloadIcon, count: 89 },
    ],
  },
];

const columns = [
  "Ombor", "Kategoriya", "Teg", "Nomi", "Artikul", "O'lchov",
  "Jami kiritilgan", "Haqiqiy qoldiq", "Qayta ishlangan", "Chiqindi", "Sostav", "Izoh",
];

const previewData = [
  { ombor: "Цех ACHAM", kategoriya: "Mato", teg: "—", nomi: "Материал 17", artikul: "mat-017", olchov: "metr", jami: 224, haqiqiy: 224, qayta: 0 },
  { ombor: "Цех ACHAM", kategoriya: "Mato", teg: "—", nomi: "Материал 19", artikul: "mat-019", olchov: "metr", jami: 31, haqiqiy: 31, qayta: 0 },
  { ombor: "Цех ACHAM", kategoriya: "Mato", teg: "—", nomi: "Материал 20", artikul: "mat-020", olchov: "metr", jami: 101, haqiqiy: 101, qayta: 0 },
  { ombor: "Цех ACHAM", kategoriya: "Mato", teg: "—", nomi: "Материал 21", artikul: "mat-021", olchov: "metr", jami: 52, haqiqiy: 52, qayta: 0 },
  { ombor: "Цех ACHAM", kategoriya: "Mato", teg: "—", nomi: "Материал 22", artikul: "mat-022", olchov: "metr", jami: 84, haqiqiy: 84, qayta: 0 },
  { ombor: "Цех ACHAM", kategoriya: "Mato", teg: "—", nomi: "Материал 23", artikul: "mat-023", olchov: "metr", jami: 41, haqiqiy: 41, qayta: 0 },
  { ombor: "Цех ACHAM", kategoriya: "Mato", teg: "—", nomi: "Материал 25", artikul: "mat-025", olchov: "metr", jami: 55, haqiqiy: 55, qayta: 0 },
];

export default function ExportPage() {
  const [selected, setSelected] = useState("raw");
  const [tab, setTab] = useState("current");
  const [enabledCols, setEnabledCols] = useState<Record<string, boolean>>(
    Object.fromEntries(columns.map((c) => [c, true]))
  );

  const toggleCol = (col: string) => {
    setEnabledCols((prev) => ({ ...prev, [col]: !prev[col] }));
  };

  return (
    <div className="flex gap-6">
      <div className="w-64 flex-shrink-0">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-danger/10 flex items-center justify-center">
            <DownloadIcon size={22} className="text-danger" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Центр экспорта</h1>
            <p className="text-xs text-ink-soft">Скачать данные</p>
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.group} className="mb-4">
            <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2 px-2">
              {section.group}
            </p>
            {section.items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors mb-1 ${
                  selected === item.id
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-ink-soft hover:bg-gray-50"
                }`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {selected === item.id && (
                  <span className="ml-auto">›</span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Layers size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Сырьё</h2>
            <span className="bg-success/10 text-success text-xs font-bold px-2.5 py-0.5 rounded-full">
              289 строк
            </span>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <Tabs
            tabs={[
              { label: "Текущий остаток", value: "current" },
              { label: "Приход и Расход", value: "inout" },
            ]}
            active={tab}
            onChange={setTab}
            variant="outline"
          />
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-ink-soft uppercase tracking-wider">USTUNLAR</p>
            <button
              onClick={() => setEnabledCols(Object.fromEntries(columns.map((c) => [c, false])))}
              className="text-xs text-primary hover:underline"
            >
              Снять все
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {columns.map((col) => (
              <button
                key={col}
                onClick={() => toggleCol(col)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  enabledCols[col]
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-ink-soft"
                }`}
              >
                {enabledCols[col] && "✓ "}{col}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs text-ink-soft mb-2">
            ПРЕДПРОСМОТР <span className="text-ink-soft/60">289 qatordan 15tasi ko&apos;rsatilmoqda</span>
          </p>
          <div className="bg-white rounded-2xl border border-border overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-bold text-ink-soft uppercase">#</th>
                  <th className="px-3 py-2 text-left font-bold text-ink-soft uppercase">Ombor</th>
                  <th className="px-3 py-2 text-left font-bold text-ink-soft uppercase">Kategoriya</th>
                  <th className="px-3 py-2 text-left font-bold text-ink-soft uppercase">Teg</th>
                  <th className="px-3 py-2 text-left font-bold text-ink-soft uppercase">Nomi</th>
                  <th className="px-3 py-2 text-left font-bold text-ink-soft uppercase">Artikul</th>
                  <th className="px-3 py-2 text-left font-bold text-ink-soft uppercase">O&apos;lchov</th>
                  <th className="px-3 py-2 text-right font-bold text-ink-soft uppercase">Jami kiritilgan</th>
                  <th className="px-3 py-2 text-right font-bold text-ink-soft uppercase">Haqiqiy qoldiq</th>
                  <th className="px-3 py-2 text-right font-bold text-ink-soft uppercase">Qayta</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-3 py-2 text-ink-soft">{i + 1}</td>
                    <td className="px-3 py-2">{row.ombor}</td>
                    <td className="px-3 py-2">{row.kategoriya}</td>
                    <td className="px-3 py-2 text-ink-soft">{row.teg}</td>
                    <td className="px-3 py-2 font-medium">{row.nomi}</td>
                    <td className="px-3 py-2 text-primary">{row.artikul}</td>
                    <td className="px-3 py-2">{row.olchov}</td>
                    <td className="px-3 py-2 text-right font-bold">{row.jami}</td>
                    <td className="px-3 py-2 text-right font-bold">{row.haqiqiy}</td>
                    <td className="px-3 py-2 text-right">{row.qayta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Button variant="primary" size="lg">
          <DownloadIcon size={18} />
          EXCEL GA YUKLAB OLISH
        </Button>
      </div>
    </div>
  );
}
