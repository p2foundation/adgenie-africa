"use client";

import { useAssistantContext } from "@/components/assistant/assistant-provider";
import type { AssistantContext } from "@/lib/assistant";

/**
 * Lets a server page tell Genie what it fetched: the value is built on the
 * server, handed down as plain JSON and registered by this leaf. It renders
 * nothing — the dock reads it when a question is asked.
 */
export function AssistantPageContext({ value }: { value: AssistantContext }) {
  useAssistantContext(value);
  return null;
}
