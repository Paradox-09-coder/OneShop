"use client";

import { useState, useMemo } from "react";
import SearchBar from "@/components/search-bar";
import Badge from "@/components/badge";
import { logs } from "@/lib/mock-data";
import { formatDateTime } from "@/lib/utils";

const actionMap = {
  CREATE: { label: "CREATE", variant: "success" as const },
  UPDATE: { label: "UPDATE", variant: "primary" as const },
  DELETE: { label: "DELETE", variant: "danger" as const },
  IMPORT: { label: "IMPORT", variant: "warning" as const },
  EXPORT: { label: "EXPORT", variant: "default" as const },
};

export default function LogsPage() {
  const [search, setSearch] = useState("");
  const [screenFilter, setScreenFilter] = useState("Все экраны");
  const [actionFilter, setActionFilter] = useState("Все действия");

  const screens = useMemo(() => {
    const s = new Set(logs.map((l) => l.screen));
    return ["Все экраны", ...Array.from(s)];
  }, []);

  const actions = ["Все действия", "CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT"];

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (screenFilter !== "Все экраны" && l.screen !== screenFilter) return false;
      if (actionFilter !== "Все действия" && l.action !== actionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!l.description.toLowerCase().includes(q) && !l.userName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [search, screenFilter, actionFilter]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Журнал аудита</h1>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 max-w-xl">
          <SearchBar placeholder="Поиск..." value={search} onChange={setSearch} />
        </div>
        <select
          value={screenFilter}
          onChange={(e) => setScreenFilter(e.target.value)}
          className="px-4 py-2.5 border border-border rounded-xl text-sm bg-white"
        >
          {screens.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-2.5 border border-border rounded-xl text-sm bg-white"
        >
          {actions.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <span className="text-sm text-ink-soft font-medium">{filtered.length} шт.</span>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Дата/Время</th>
              <th className="text-left px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Пользователь</th>
              <th className="text-center px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Экран</th>
              <th className="text-center px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Действие</th>
              <th className="text-left px-6 py-3 text-xs font-bold text-ink-soft uppercase tracking-wider">Описание</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((log) => (
              <tr key={log.id} className="border-b border-border/50 hover:bg-gray-50/50">
                <td className="px-6 py-4 text-sm text-ink-soft">{formatDateTime(log.createdAt)}</td>
                <td className="px-6 py-4 font-medium">{log.userName}</td>
                <td className="px-6 py-4 text-center">
                  <Badge variant="outline">{log.screen}</Badge>
                </td>
                <td className="px-6 py-4 text-center">
                  <Badge variant={actionMap[log.action].variant}>
                    {actionMap[log.action].label}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm text-ink-soft">{log.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
