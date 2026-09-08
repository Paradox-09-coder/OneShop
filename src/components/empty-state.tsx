import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface Props {
  title?: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({
  title = "Ma'lumot topilmadi",
  message,
  icon,
  action,
}: Props) {
  return (
    <div className="p-12 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-gray-100 grid place-items-center text-ink-soft mb-4">
        {icon ?? <Inbox size={24} />}
      </div>
      <h3 className="font-semibold text-ink">{title}</h3>
      {message && <p className="text-sm text-ink-soft mt-1">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
