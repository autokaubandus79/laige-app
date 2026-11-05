import Link from "next/link";

export default function StatusLinkNotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-xl font-bold">Seda linki ei leitud</h1>
      <p className="mt-2 text-muted-foreground">Kontrolli linki või otsi päringut koodi ja e-posti järgi.</p>
      <Link href="/status" className="mt-3 inline-block font-semibold text-primary underline">
        Vaata staatust
      </Link>
    </div>
  );
}
