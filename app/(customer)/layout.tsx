import { AssistantShell } from "@/components/assistant/assistant-shell";
import { getAssistantData } from "@/lib/catalog";

// Anna's answers come from the database, so these pages cannot be prerendered.
export const dynamic = "force-dynamic";

async function loadAssistant() {
  try {
    return await getAssistantData();
  } catch (error) {
    // The page itself decides how to handle a database outage.
    console.error("Loading the assistant failed", error);
    return null;
  }
}

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <AssistantShell assistant={await loadAssistant()}>{children}</AssistantShell>;
}
