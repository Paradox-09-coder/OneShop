"use client";

import { useState, useRef } from "react";
import Button from "@/components/button";
import { FileUp, Download, FileSpreadsheet } from "lucide-react";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview([
        ["Материал 300", "Mato", "metr", "50", "Цех ACHAM"],
        ["Материал 301", "Нить", "dona", "100", "Цех ACHAM"],
        ["Материал 302", "Пуговицы", "dona", "200", "Store ACHAM"],
      ]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Ma&apos;lumot import qilish</h1>
      <p className="text-ink-soft mb-8">
        Excel faylni yuklang — saqlashdan oldin ko&apos;rib chiqasiz
      </p>

      <div className="flex gap-4 mb-8">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-3 px-6 py-5 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary-dark transition-colors"
        >
          <FileSpreadsheet size={22} />
          EXCEL FAYLNI TANLASH
        </button>
        <button className="flex-1 flex items-center justify-center gap-3 px-6 py-5 bg-white border border-border rounded-2xl font-bold text-sm text-ink-soft hover:bg-gray-50 transition-colors">
          <Download size={22} />
          SHABLONNI YUKLAB OLISH
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {file && (
        <div className="animate-fadeIn">
          <div className="bg-white rounded-2xl border border-border p-5 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <FileSpreadsheet size={20} className="text-success" />
              <span className="font-medium">{file.name}</span>
              <span className="text-xs text-ink-soft">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>

            {preview && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-3 py-2 text-xs font-bold text-ink-soft">Nomi</th>
                      <th className="text-left px-3 py-2 text-xs font-bold text-ink-soft">Kategoriya</th>
                      <th className="text-left px-3 py-2 text-xs font-bold text-ink-soft">O&apos;lchov</th>
                      <th className="text-right px-3 py-2 text-xs font-bold text-ink-soft">Miqdor</th>
                      <th className="text-left px-3 py-2 text-xs font-bold text-ink-soft">Ombor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="px-3 py-2 font-medium">{row[0]}</td>
                        <td className="px-3 py-2 text-ink-soft">{row[1]}</td>
                        <td className="px-3 py-2">{row[2]}</td>
                        <td className="px-3 py-2 text-right font-bold">{row[3]}</td>
                        <td className="px-3 py-2 text-ink-soft">{row[4]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="primary" size="lg">
              <FileUp size={18} />
              IMPORT QILISH
            </Button>
            <Button variant="outline" size="lg" onClick={() => { setFile(null); setPreview(null); }}>
              BEKOR QILISH
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
