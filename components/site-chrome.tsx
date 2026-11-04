import Link from "next/link";
import { Mail, Phone, Search, Sparkles } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-primary">
          <Sparkles className="size-5" aria-hidden />
          Läige
        </Link>
        <Link
          href="/status"
          className="inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <Search className="size-4" aria-hidden />
          Vaata staatust
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 pb-28 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:pb-6">
        <span>© Läige kodukoristus</span>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <a href="tel:+37255550000" className="inline-flex items-center gap-2 hover:text-primary">
            <Phone className="size-4" aria-hidden />
            +372 5555 0000
          </a>
          <a href="mailto:info@laige.example" className="inline-flex items-center gap-2 hover:text-primary">
            <Mail className="size-4" aria-hidden />
            info@laige.example
          </a>
        </div>
      </div>
    </footer>
  );
}
