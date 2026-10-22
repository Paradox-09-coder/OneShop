// Har navigatsiyada qayta o'rnatiladi — sahifa bloklari pastdan
// ko'tarilib chiqish animatsiyasi (globals.css: .page-enter).
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
