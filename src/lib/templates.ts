import type { CreateFormValues } from "@/features/agent-builder/create/MinimalCreateForm";
import type { IconName } from "@/components/ui/Icon";

export interface AgentTemplate {
  id: string;
  icon: IconName;
  title: string;
  tagline: string;
  values: CreateFormValues;
}

export const agentTemplates: AgentTemplate[] = [
  {
    id: "clinic-front-desk",
    icon: "user",
    title: "Clinic front desk",
    tagline: "Books and reschedules appointments, answers insurance questions",
    values: {
      name: "Clinic Front Desk",
      purpose: "Answer incoming calls, book or reschedule appointments, and answer basic insurance questions",
      direction: "inbound",
    },
  },
  {
    id: "restaurant-reservations",
    icon: "list",
    title: "Restaurant reservations",
    tagline: "Takes reservations, shares hours and menu basics",
    values: {
      name: "Restaurant Reservations",
      purpose: "Take dinner reservations, quote wait times, and answer hours and menu questions",
      direction: "inbound",
    },
  },
  {
    id: "support-triage",
    icon: "wrench",
    title: "Support triage",
    tagline: "Answers common questions, logs a ticket for the rest",
    values: {
      name: "Support Triage",
      purpose: "Answer common product questions and log a ticket with details for anything else",
      direction: "inbound",
    },
  },
  {
    id: "real-estate-lead-followup",
    icon: "flag",
    title: "Real estate lead follow-up",
    tagline: "Calls new leads to qualify interest and book a showing",
    values: {
      name: "Real Estate Lead Follow-up",
      purpose: "Call new leads, qualify budget and timeline, and book a showing with an agent",
      direction: "outbound",
    },
  },
  {
    id: "payment-reminders",
    icon: "clock",
    title: "Payment reminders",
    tagline: "Calls customers with overdue balances and offers payment options",
    values: {
      name: "Payment Reminders",
      purpose: "Remind customers of an overdue balance and offer to take a payment or set up a plan",
      direction: "outbound",
    },
  },
  {
    id: "event-confirmations",
    icon: "check",
    title: "Event confirmations",
    tagline: "Confirms attendance and shares event logistics",
    values: {
      name: "Event Confirmations",
      purpose: "Confirm attendance for an upcoming event and share date, time, and location",
      direction: "outbound",
    },
  },
  {
    id: "promo-sales-outreach",
    icon: "sparkles",
    title: "Sale & promo outreach",
    tagline: "Tells past customers about a sale or offer and notes who's interested",
    values: {
      name: "Sale & Promo Outreach",
      purpose: "Tell past customers about our current sale, mention the discount, and note down who wants to come in or order",
      direction: "outbound",
    },
  },
];
