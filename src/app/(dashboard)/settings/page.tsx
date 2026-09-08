"use client";

import { useState } from "react";
import Tabs from "@/components/tabs";
import Button from "@/components/button";
import { User, Layers, Users, Settings as SettingsIcon, Globe, LogOut } from "lucide-react";

const settingsTabs = [
  { label: "Профиль", value: "profile" },
  { label: "Сырьё", value: "raw" },
  { label: "Пользователи", value: "users" },
  { label: "Система", value: "system" },
  { label: "Переводы", value: "translations" },
];

const users = [
  { id: "1", name: "Administrator", username: "admin", email: "admin@ishlab.uz", role: "Super Admin" },
  { id: "2", name: "Камрон", username: "kamron_asoschi", email: "kamron@ishlab.uz", role: "Admin" },
  { id: "3", name: "Ассистент", username: "assistant", email: "assistant@ishlab.uz", role: "User" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Настройки</h1>

      <Tabs
        tabs={settingsTabs.map((t) => ({ label: t.label, value: t.value }))}
        active={activeTab}
        onChange={setActiveTab}
      />

      <div className="mt-6">
        {activeTab === "profile" && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-2xl border border-border p-6 mb-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User size={28} className="text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="font-bold text-lg">Administrator</h2>
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                    Super Admin
                  </span>
                </div>
                <div className="text-right text-sm text-ink-soft">
                  <p>Имя пользователя: <strong className="text-ink">admin</strong></p>
                  <p>Email: <strong className="text-ink">admin@ishlab.uz</strong></p>
                </div>
              </div>
              <div className="mt-4">
                <button className="flex items-center gap-2 text-sm text-danger hover:text-red-700 font-medium">
                  <LogOut size={16} />
                  ВЫЙТИ ИЗ СИСТЕМЫ
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🔑</span>
                <h3 className="font-bold">Изменить пароль</h3>
              </div>
              <div className="space-y-4 max-w-sm">
                <div>
                  <label className="block text-sm font-medium mb-1">Новый пароль</label>
                  <input
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Подтвердите пароль</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-sm"
                  />
                </div>
                <Button variant="danger" size="lg" className="w-full">
                  ИЗМЕНИТЬ ПАРОЛЬ
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Пользователи</h2>
              <Button variant="primary" size="md">
                <Users size={16} />
                ДОБАВИТЬ
              </Button>
            </div>
            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-xs font-bold text-ink-soft uppercase">Имя</th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-ink-soft uppercase">Логин</th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-ink-soft uppercase">Email</th>
                    <th className="text-center px-6 py-3 text-xs font-bold text-ink-soft uppercase">Роль</th>
                    <th className="text-right px-6 py-3 text-xs font-bold text-ink-soft uppercase">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border/50 hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-medium">{u.name}</td>
                      <td className="px-6 py-4 text-sm text-ink-soft">{u.username}</td>
                      <td className="px-6 py-4 text-sm text-ink-soft">{u.email}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-sm text-primary hover:underline">Изменить</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "raw" && (
          <div className="bg-white rounded-2xl border border-border p-6 max-w-xl">
            <h2 className="font-bold mb-4">Настройки сырья</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Минимальный остаток по умолчанию</label>
                <input type="number" defaultValue={10} className="w-full px-4 py-2.5 border border-border rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Единица измерения по умолчанию</label>
                <select className="w-full px-4 py-2.5 border border-border rounded-xl text-sm">
                  <option>metr</option>
                  <option>dona</option>
                  <option>kg</option>
                </select>
              </div>
              <Button variant="primary">Сохранить</Button>
            </div>
          </div>
        )}

        {activeTab === "system" && (
          <div className="bg-white rounded-2xl border border-border p-6 max-w-xl">
            <h2 className="font-bold mb-4">Системные настройки</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Название компании</label>
                <input type="text" defaultValue="Ishlab Chiqarish" className="w-full px-4 py-2.5 border border-border rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Язык по умолчанию</label>
                <select className="w-full px-4 py-2.5 border border-border rounded-xl text-sm">
                  <option>Русский</option>
                  <option>O&apos;zbek</option>
                </select>
              </div>
              <Button variant="primary">Сохранить</Button>
            </div>
          </div>
        )}

        {activeTab === "translations" && (
          <div className="bg-white rounded-2xl border border-border p-6 max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={20} className="text-primary" />
              <h2 className="font-bold">Переводы интерфейса</h2>
            </div>
            <p className="text-ink-soft text-sm">
              Тут вы можете настроить переводы ключевых элементов интерфейса на узбекский и русский языки.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
