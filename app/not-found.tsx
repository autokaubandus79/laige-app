import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-xl font-bold">Lehte ei leitud</h1>
      <Link href="/" className="mt-3 inline-block font-semibold text-primary underline">
        Tagasi avalehele
      </Link>
    </div>
  );
}
