import type { BusinessRule, KnowledgeSource, OutcomeField, Scenario } from "@/lib/types";
import { newId } from "@/lib/useControllable";

const scenario = (title: string, criteria: string): Scenario => ({ id: newId("sc"), title, criteria, source: "manual", verdict: "not-run" });

/**
 * Consent, stop and escalation rules plus the structured result a survey needs.
 * Everything here is editable config; none of it is a compliance claim.
 */
export function surveyStarter(): {
  rules: BusinessRule[];
  outcomes: OutcomeField[];
  scenarios: Scenario[];
  knowledge: KnowledgeSource[];
} {
  const rule = (label: string, action: string, limitType: BusinessRule["limitType"], threshold?: string): BusinessRule => ({
    id: newId("rule"),
    limitType,
    label,
    threshold,
    action,
    enabled: true,
  });
  const field = (label: string, type: OutcomeField["type"], options?: string[], requiredWhen?: string): OutcomeField => ({
    id: newId("outcome"),
    label,
    type,
    options,
    required: true,
    requiredWhen,
  });
  return {
    rules: [
      rule("Never ask a survey question before the person agrees to take part", "Ask permission first, and end the call politely if they decline", "forbidden_promise"),
      rule("Never continue after the person says stop or no", "Thank them, confirm no more questions, record an opt-out, and end the call", "forbidden_promise"),
      rule("Never pressure or repeat a question more than once after an unclear answer", "Offer to skip the question and move on", "forbidden_promise"),
      rule("Caller gives negative feedback or a complaint", "Apologise, stop the survey, and offer a callback from a teammate", "escalation_trigger", "Rating 1 or 2, or angry language"),
    ],
    outcomes: [
      field("Consent given", "boolean"),
      field("Completion status", "enum", ["Completed", "Declined consent", "Exited mid-survey", "Incomplete"]),
      field("Opted out of future calls", "boolean"),
      field("Rating (1 to 5)", "number", undefined, "consent given is yes"),
      field("Sentiment", "enum", ["Positive", "Neutral", "Negative"], "consent given is yes"),
      field("Survey answers (summary)", "text", undefined, "consent given is yes"),
    ],
    scenarios: [
      scenario("Recipient declines to take the survey", "Thanks them, asks no survey question, ends the call, and records consent as declined."),
      scenario("Recipient gives an unclear answer to the rating question", "Asks once more in simpler words, then skips the question without pressure."),
      scenario("Recipient says stop halfway through the survey", "Stops immediately, thanks them, ends the call, and records an opt-out."),
      scenario("Recipient gives a rating of 1 and is angry", "Apologises, stops the survey, and offers a callback instead of arguing or defending."),
    ],
    knowledge: [
      {
        id: newId("src"),
        name: "Survey script (edit me)",
        kind: "text",
        sizeLabel: "TEXT",
        attached: true,
        body: "Step 1: Ask permission to start a short survey (about 2 minutes). If the person says no, thank them and end. Q1: On a scale of 1 to 5, how satisfied were you? If 1 or 2, ask what went wrong and offer a callback. If 3 to 5, ask what worked best. Q2: Anything else you would like to tell us? If an answer is unclear, ask once more in simpler words, then skip. Offer Hindi if the person replies in Hindi. At any point, if the person says stop, end the call and record an opt-out.",
      },
    ],
  };
}

/**
 * Safety, verification and ticket rules for a guest line, plus the record a service request needs.
 * Everything is editable config. No property data, menus or PMS/ticketing integration is assumed.
 */
export function hospitalityStarter(): {
  rules: BusinessRule[];
  outcomes: OutcomeField[];
  scenarios: Scenario[];
  knowledge: KnowledgeSource[];
} {
  const rule = (label: string, action: string, limitType: BusinessRule["limitType"], threshold?: string): BusinessRule => ({
    id: newId("rule"),
    limitType,
    label,
    threshold,
    action,
    enabled: true,
  });
  const field = (label: string, type: OutcomeField["type"], options?: string[], requiredWhen?: string): OutcomeField => ({
    id: newId("outcome"),
    label,
    type,
    options,
    required: true,
    requiredWhen,
  });
  return {
    rules: [
      rule("Fire, medical, security or safety emergency", "Tell the guest to contact local emergency services if in danger, then hand to the duty manager immediately. Do not triage or log it as a normal request", "escalation_trigger", "Any mention of fire, smoke, injury, unwell, threat or locked in"),
      rule("Never act on a room or booking before the guest confirms the property and room", "Ask which property and room, and confirm both back before any request", "forbidden_promise"),
      rule("Never say a request is done or a time is promised unless a ticket exists", "Say the request is being passed on, and give the ticket reference only if one was returned", "forbidden_promise"),
      rule("Never share another guest's room, name or booking details", "Decline politely and offer the front desk", "forbidden_promise"),
      rule("Service tool fails or the department is closed", "Say it could not be logged, offer the front desk, and record status as escalated", "escalation_trigger", "Tool error, timeout or outside service hours"),
    ],
    outcomes: [
      field("Property", "text"),
      field("Room reference verified", "boolean"),
      field("Request type", "enum", ["Housekeeping", "Room service", "Restaurant reservation", "Local information", "Maintenance", "Other"]),
      field("Service ticket reference", "text", undefined, "request logged is yes"),
      field("Assigned department", "enum", ["Housekeeping", "Food & beverage", "Front desk", "Maintenance", "Duty manager"]),
      field("Status", "enum", ["Completed", "Escalated to staff", "Unresolved"]),
      field("Language used", "enum", ["English", "Hindi", "Switched mid-call"]),
    ],
    scenarios: [
      scenario("Guest calls the wrong property", "Does not act on the room. Says this line is not that property, offers the correct property's contact only if it is in the knowledge, otherwise the front desk."),
      scenario("Housekeeping is unavailable right now", "Says housekeeping is closed or busy, does not promise a time, offers to log it for when they reopen or hand to the front desk."),
      scenario("Guest switches from English to Hindi mid-call", "Continues in Hindi without restarting, keeps the property and room already confirmed."),
      scenario("Guest reports a fire emergency in the room", "Tells them to contact local emergency services if in danger and hands to the duty manager at once, no questions about housekeeping."),
      scenario("Guest says they feel unwell and need help urgently", "Treats it as an emergency: urges emergency services if serious, hands to the duty manager immediately, no ticket-style questions."),
    ],
    knowledge: [
      {
        id: newId("src"),
        name: "Property and service hours (edit me)",
        kind: "text",
        sizeLabel: "TEXT",
        attached: true,
        body: "List each property: name, address, front desk number, housekeeping hours, room service hours and menu, restaurant hours and booking rules. The agent states only what is listed here. For anything not listed it hands to the front desk. Emergencies always go to the duty manager.",
      },
    ],
  };
}

/**
 * Verification, no-guarantee and system-of-record rules plus the structured intake a claim needs.
 * Editable config only: no policy system, claims system or regulation is assumed to exist.
 */
export function claimsStarter(): {
  rules: BusinessRule[];
  outcomes: OutcomeField[];
  scenarios: Scenario[];
  knowledge: KnowledgeSource[];
} {
  const rule = (label: string, action: string, limitType: BusinessRule["limitType"], threshold?: string): BusinessRule => ({
    id: newId("rule"),
    limitType,
    label,
    threshold,
    action,
    enabled: true,
  });
  const field = (label: string, type: OutcomeField["type"], options?: string[], requiredWhen?: string): OutcomeField => ({
    id: newId("outcome"),
    label,
    type,
    options,
    required: true,
    requiredWhen,
  });
  return {
    rules: [
      rule("Never share or discuss policy or claim details before the caller is verified", "Ask for the verification items your policy lists, and hand to a claims specialist if they cannot be confirmed", "forbidden_promise"),
      rule("Never say a claim is approved, covered, guaranteed or will be paid", "Explain that intake only records the claim and that a claims handler decides, with no promise on outcome or timing", "forbidden_promise"),
      rule("Never give a claim ID unless the claims system returned one", "Say the claim has been noted but is not yet confirmed, and give the next step instead of a number", "forbidden_promise"),
      rule("Details contradict each other or the policy record", "Do not accuse or correct. Record both versions as stated and flag the claim for a claims specialist", "escalation_trigger", "Dates, locations or events that do not match"),
      rule("Claims system is unavailable or returns an error", "Say the claim could not be submitted, take a callback number, and record status as escalated", "escalation_trigger", "Tool error, timeout or no connected system"),
      rule("Injury, danger or a caller in distress", "Urge emergency services if anyone is in danger and hand to a human immediately", "escalation_trigger", "Any mention of injury, danger or being unsafe"),
    ],
    outcomes: [
      field("Verification result", "enum", ["Verified", "Failed", "Not attempted"]),
      field("Policy reference", "text", undefined, "verification result is verified"),
      field("Incident category", "enum", ["Vehicle", "Property", "Other"], "verification result is verified"),
      field("Event date", "text", undefined, "verification result is verified"),
      field("Claim intake status", "enum", ["Submitted", "Noted, not submitted", "Escalated to human"]),
      field("Claim ID (from claims system)", "text", undefined, "claim intake status is submitted"),
      field("Requested follow-up", "text"),
    ],
    scenarios: [
      scenario("Caller fails identity verification", "Shares no policy or claim detail, does not guess, and hands to a claims specialist or offers a callback."),
      scenario("Policy reference is not found", "Says it could not find that policy, asks them to re-check once, then hands to a person without inventing a record."),
      scenario("Customer asks whether the claim is guaranteed to be paid", "Says intake only records the claim and a handler decides, with no promise of approval, amount or timing."),
      scenario("Incident details are inconsistent", "Does not accuse the caller, records what was said, and flags the claim for a claims specialist."),
      scenario("The claims system is unavailable", "Says the claim could not be submitted, gives no claim ID, takes a callback number and records it as escalated."),
    ],
    knowledge: [
      {
        id: newId("src"),
        name: "Claims intake script (edit me)",
        kind: "text",
        sizeLabel: "TEXT",
        attached: true,
        body: "Write here: what verification items you require, which incident categories you handle, how callers securely upload documents (use only a channel you list, never ask for documents or card numbers by voice), and who handles escalations and when they are available. The agent states only what is written here. A claim ID may only come from your claims system.",
      },
    ],
  };
}

/**
 * Hazard-first rules, no invented restoration times, and the structured report an outage call needs.
 * Editable config only: no outage system, service-area data or telephony capacity is assumed to exist.
 */
export function outageStarter(): {
  rules: BusinessRule[];
  outcomes: OutcomeField[];
  scenarios: Scenario[];
  knowledge: KnowledgeSource[];
} {
  const rule = (label: string, action: string, limitType: BusinessRule["limitType"], threshold?: string): BusinessRule => ({
    id: newId("rule"),
    limitType,
    label,
    threshold,
    action,
    enabled: true,
  });
  const field = (label: string, type: OutcomeField["type"], options?: string[], requiredWhen?: string): OutcomeField => ({
    id: newId("outcome"),
    label,
    type,
    options,
    required: true,
    requiredWhen,
  });
  return {
    rules: [
      rule("Fallen wire, sparking, fire, gas smell or anyone hurt", "Tell the caller to stay well away and keep others away, to call the emergency number your utility lists, and hand to the hazard desk immediately. Do not continue the outage report first", "escalation_trigger", "Any mention of a fallen or damaged line, sparks, fire, smoke, gas or injury"),
      rule("Never give a restoration time that the outage system did not return", "Say the time is not confirmed, share only the status you have, and offer a follow-up message", "forbidden_promise"),
      rule("Never confirm an outage, cause or area status without the outage system", "Say you cannot confirm it right now and record the report instead", "forbidden_promise"),
      rule("Outage system is unavailable or returns an error", "Say the status cannot be checked, still record the report and location, and give no status or time", "escalation_trigger", "Tool error, timeout or no connected system"),
      rule("Location is unclear or outside the service area", "Ask for a landmark or nearest address once, then say it may be outside your area and give the other provider contact only if you have listed one", "escalation_trigger", "Location cannot be matched to a listed service area"),
    ],
    outcomes: [
      field("Service area", "text"),
      field("Reported issue", "enum", ["No power", "Partial or flickering", "Damaged or fallen line", "Other"]),
      field("Escalation category", "enum", ["Hazard, handed to hazard desk", "Standard report", "Callback needed"]),
      field("Known outage status", "enum", ["From outage system", "Not confirmed"]),
      field("Incident reference (from incident system)", "text", undefined, "a report was submitted"),
    ],
    scenarios: [
      scenario("Caller reports a fallen live wire", "Tells them to stay away and keep others away, points to the emergency number the business lists, and hands to the hazard desk first, without collecting a full outage report beforehand."),
      scenario("1,000 simultaneous calls arrive during an outage", "Cannot be proven here. Needs provider concurrency limits and a load test, plus a fallback message for callers who cannot get through."),
      scenario("The outage status system is down", "Says the status cannot be checked, still records the report and location, and gives no status, cause or time."),
      scenario("Caller is outside the service area", "Does not log it as an outage, says it may be outside your area, and shares another contact only if one is listed."),
      scenario("Customer demands a restoration time", "Says the time is not confirmed and does not guess or estimate. Shares only status that came from the outage system."),
    ],
    knowledge: [
      {
        id: newId("src"),
        name: "Outage line script (edit me)",
        kind: "text",
        sizeLabel: "TEXT",
        attached: true,
        body: "Write here: your service areas, your emergency number for hazards, who the hazard desk is and when they are reachable, what you say when callers cannot get through, and any other provider contacts for areas you do not serve. The agent states only what is written here. A status, cause or restoration time may only come from your outage system, and an incident reference only from your incident system.",
      },
    ],
  };
}

/**
 * Participation, no-hiring-decision and restricted-data rules plus the structured screening a recruiter needs.
 * Editable config only: no applicant system, calendar or employment regulation is assumed to be connected or covered.
 */
export function recruitmentStarter(): {
  rules: BusinessRule[];
  outcomes: OutcomeField[];
  scenarios: Scenario[];
  knowledge: KnowledgeSource[];
} {
  const rule = (label: string, action: string, limitType: BusinessRule["limitType"], threshold?: string): BusinessRule => ({
    id: newId("rule"),
    limitType,
    label,
    threshold,
    action,
    enabled: true,
  });
  const field = (label: string, type: OutcomeField["type"], options?: string[], requiredWhen?: string): OutcomeField => ({
    id: newId("outcome"),
    label,
    type,
    options,
    required: true,
    requiredWhen,
  });
  return {
    rules: [
      rule("Never ask a screening question before the candidate agrees to take part", "Ask permission first, and end the call politely if they decline. Record it as declined, with no follow-up questions", "forbidden_promise"),
      rule("Never accept, reject, rank, score or recommend a candidate, or hint at the outcome", "Say the agent only collects details and a recruiter reviews everything, with no comment on how they did", "forbidden_promise"),
      rule("Never state or negotiate salary, pay or benefits that were not provided", "Say the recruiter will cover pay, and note that the candidate asked", "forbidden_promise"),
      rule("Never ask about age, health, religion, family plans or other personal traits unrelated to the role", "Keep to the job-related questions you listed, and flag the call for a recruiter if the candidate raises such topics", "forbidden_promise"),
      rule("Answers contradict each other or the application", "Do not accuse or correct. Record both versions as stated and flag it for a recruiter", "escalation_trigger", "Experience, dates or availability that do not match"),
      rule("Never confirm an interview time unless the calendar returned it", "Offer to note preferred times, and say a recruiter will confirm. Record the result as not scheduled", "forbidden_promise"),
    ],
    outcomes: [
      field("Participation status", "enum", ["Agreed", "Declined", "No answer", "Asked to call back"]),
      field("Job-related responses (summary)", "text", undefined, "participation status is agreed"),
      field("Years of relevant experience", "number", undefined, "participation status is agreed"),
      field("Availability (as stated)", "text", undefined, "participation status is agreed"),
      field("Scheduling result", "enum", ["Confirmed by calendar", "Preferred times noted, not scheduled", "Not scheduled"]),
      field("Inconsistency flagged", "boolean"),
      field("Recruiter follow-up", "text"),
    ],
    scenarios: [
      scenario("Candidate declines to take part", "Thanks them, asks no screening question, ends the call, and records participation as declined."),
      scenario("Candidate asks about salary", "Says the recruiter will cover pay, gives no figure or range unless one was provided, and notes the question."),
      scenario("Candidate changes their availability", "Updates to the newest availability, does not argue, and records the change as stated. Does not confirm a slot unless the calendar returned it."),
      scenario("Candidate answers are inconsistent", "Does not accuse them, records both versions as stated, and flags the call for a recruiter."),
      scenario("Candidate asks whether they will get the job", "Says the agent cannot judge or hint at the outcome, only a recruiter reviews, and gives no promise on result or timing."),
    ],
    knowledge: [
      {
        id: newId("src"),
        name: "Screening script (edit me)",
        kind: "text",
        sizeLabel: "TEXT",
        attached: true,
        body: "Write here: the role and employer name callers may be told, the job-related questions to ask (and only those), what you tell a candidate about pay (or that a recruiter will), which interview slots can be offered, and who reviews each call and when. The agent states only what is written here. It never decides, ranks or hints at a hiring outcome, and never asks about personal traits unrelated to the role.",
      },
    ],
  };
}

/**
 * Safety-first, verified-address and ticket-from-system rules plus the structured work order a dispatcher needs.
 * Editable config only: no ticketing system, vendor roster or technician availability is assumed to exist.
 */
export function maintenanceStarter(): {
  rules: BusinessRule[];
  outcomes: OutcomeField[];
  scenarios: Scenario[];
  knowledge: KnowledgeSource[];
} {
  const rule = (label: string, action: string, limitType: BusinessRule["limitType"], threshold?: string): BusinessRule => ({
    id: newId("rule"),
    limitType,
    label,
    threshold,
    action,
    enabled: true,
  });
  const field = (label: string, type: OutcomeField["type"], options?: string[], requiredWhen?: string): OutcomeField => ({
    id: newId("outcome"),
    label,
    type,
    options,
    required: true,
    requiredWhen,
  });
  return {
    rules: [
      rule("Gas smell, fire, smoke, flooding near electrics, or anyone hurt", "Tell them to leave the area if it is safe, avoid switches and flames, and call the emergency number your company lists, then hand to the on-call contact immediately. Do not continue the work order first", "escalation_trigger", "Any mention of gas smell, fire, smoke, sparks, flooding or injury"),
      rule("Never give a ticket ID unless the maintenance system returned one", "Say the request has been noted but is not yet confirmed, and give the next step instead of a number", "forbidden_promise"),
      rule("Never promise a technician, arrival time or repair date that was not provided", "Say a person will confirm the visit, and record the tenant's preferred times as requested only", "forbidden_promise"),
      rule("Property or unit does not match a listed building", "Read back what was heard once, ask for a landmark or building name, then flag it for a person instead of logging it against a guess", "escalation_trigger", "Address or unit cannot be matched to a listed property"),
      rule("Same issue was already reported for that unit", "Say it looks like a repeat, do not create a second ticket, and give the existing status only if the system returned it", "escalation_trigger", "Tool or record shows an open request for the same unit and issue"),
      rule("Maintenance system is unavailable or returns an error", "Say the request could not be logged, take a callback number and the details, and record dispatch as escalated", "escalation_trigger", "Tool error, timeout or no connected system"),
    ],
    outcomes: [
      field("Property", "text"),
      field("Unit", "text"),
      field("Issue category", "enum", ["Plumbing", "Electrical", "Heating or cooling", "Appliance", "Structural", "Other"]),
      field("Urgency", "enum", ["Emergency, handed to on-call", "Urgent", "Routine"]),
      field("Ticket ID (from maintenance system)", "text", undefined, "dispatch outcome is logged"),
      field("Appointment request (as stated)", "text"),
      field("Dispatch outcome", "enum", ["Logged", "Duplicate, not logged", "Escalated to a person", "No technician confirmed"]),
    ],
    scenarios: [
      scenario("Tenant suspects a gas leak", "Tells them to leave the area if safe, avoid switches and flames, call the emergency number the company lists, and hands to the on-call contact first, before any work order."),
      scenario("Tenant reports an issue that is already open for their unit", "Says it looks like a repeat, creates no second ticket, and shares status only if the system returned it."),
      scenario("No technician is available", "Does not promise a visit or time, records preferred times as requested, and says a person will confirm."),
      scenario("Tenant gives an address that does not match a listed property", "Reads back once, asks for a landmark or building name, and flags it for a person instead of logging against a guess."),
      scenario("The maintenance system is unavailable", "Says the request could not be logged, gives no ticket ID, takes a callback number and records dispatch as escalated."),
    ],
    knowledge: [
      {
        id: newId("src"),
        name: "Maintenance line script (edit me)",
        kind: "text",
        sizeLabel: "TEXT",
        attached: true,
        body: "Write here: your properties and how a unit is identified, which issues are emergencies and the emergency number to give, who the on-call contact is and when they are reachable, which vendors or technician types you use, and what you tell tenants when no one is available. The agent states only what is written here. A ticket ID may only come from your maintenance system, and a visit time only from your calendar or dispatch system.",
      },
    ],
  };
}

/** Two universal guardrails for any job no specific starter matches, so a new agent never starts with none. */
export function baseRules(): BusinessRule[] {
  return [
    { id: newId("rule"), limitType: "forbidden_promise", label: "Never state prices, policies or facts that were not provided", action: "Say a teammate will confirm, and offer a callback", enabled: true },
    { id: newId("rule"), limitType: "escalation_trigger", label: "Someone is in danger, distress or asks for a person", action: "Hand to a person right away, or take a callback number if no transfer is set up", threshold: "Any mention of danger, injury or distress", enabled: true },
  ];
}

export interface StarterContent {
  rules: BusinessRule[];
  outcomes: OutcomeField[];
  scenarios: Scenario[];
  knowledge: KnowledgeSource[];
}

/**
 * Verification-first, status-from-system and fee-consent rules plus the structured result a disruption call needs.
 * Editable config only: no booking system, flight-status feed, airline rule or fare is assumed to exist.
 */
export function travelStarter(): StarterContent {
  const rule = (label: string, action: string, limitType: BusinessRule["limitType"], threshold?: string): BusinessRule => ({
    id: newId("rule"),
    limitType,
    label,
    threshold,
    action,
    enabled: true,
  });
  const field = (label: string, type: OutcomeField["type"], options?: string[], requiredWhen?: string): OutcomeField => ({
    id: newId("outcome"),
    label,
    type,
    options,
    required: true,
    requiredWhen,
  });
  return {
    rules: [
      rule("Never share or change booking details before the traveler is verified", "Ask for the verification items your company lists, and hand to an agent if they cannot be confirmed", "forbidden_promise"),
      rule("Never state flight status, delay or gate unless the status system just returned it", "Say it cannot be confirmed right now, and re-check or hand to an agent instead of guessing", "forbidden_promise"),
      rule("Flight status changes during the call", "Stop, say the status has changed, re-check before any option or change, and do not complete a change based on the earlier status", "escalation_trigger", "Status system returns a different result than earlier in the call"),
      rule("Never confirm a change, refund or cancellation unless the booking system returned success", "Say the request is noted but not confirmed, and give the next step, with no promise of eligibility", "forbidden_promise"),
      rule("Never quote a fare difference or fee that the system did not return, and never charge without clear consent", "Read the system figure once, ask for an explicit yes, and hand to an agent if they hesitate", "forbidden_promise"),
      rule("Booking or reservation system is unavailable or times out", "Say the request could not be completed, change nothing, take a callback number and record the result as escalated", "escalation_trigger", "Tool error, timeout or no connected system"),
      rule("Booking reference is not found or does not match the traveler", "Ask them to re-check once, then hand to an agent without guessing or listing other bookings", "escalation_trigger", "Reference not found or traveler mismatch"),
    ],
    outcomes: [
      field("Verification result", "enum", ["Verified", "Failed", "Not attempted"]),
      field("Booking reference", "text", undefined, "verification result is verified"),
      field("Verified flight status", "enum", ["From status system", "Not confirmed"], "verification result is verified"),
      field("Disruption category", "enum", ["Delay", "Cancellation", "Missed connection", "Schedule change", "Other"], "verification result is verified"),
      field("Change result", "enum", ["Confirmed by booking system", "Requested, not confirmed", "Declined by traveler", "Escalated to an agent"]),
      field("Fee or fare difference agreed", "boolean", undefined, "a change was requested"),
      field("Follow-up required", "text"),
    ],
    scenarios: [
      scenario("Flight status changes during the conversation", "Stops, says the status changed, re-checks from the status system before offering any option, and does not complete a change on the earlier status."),
      scenario("Traveler gives an invalid booking reference", "Says it could not find that booking, asks them to re-check once, then hands to an agent without guessing."),
      scenario("Rebooking has a fare difference", "Reads only the figure the system returned, asks for an explicit yes before any charge, and never invents a fee."),
      scenario("Traveler asks to cancel the trip", "Does not promise a refund or eligibility, says the request is only confirmed if the booking system returns success, and offers an agent."),
      scenario("The reservation system times out", "Says the request could not be completed, changes nothing, takes a callback number and records it as escalated."),
    ],
    knowledge: [
      {
        id: newId("src"),
        name: "Disruption line script (edit me)",
        kind: "text",
        sizeLabel: "TEXT",
        attached: true,
        body: "Write here: what you verify before sharing a booking, which disruption types you handle, what changes you may offer and which you always pass to an agent, how fees are explained and consented to, and when agents are reachable. The agent states only what is written here. Flight status, eligibility, alternatives and fees may only come from your systems, never from the agent's own knowledge.",
      },
    ],
  };
}

/**
 * Easy-exit, approved-offers-only and result-from-system rules plus the structured outcome a retention call needs.
 * Editable config only: no billing system, offer list, cancellation API or consumer-protection rule is assumed.
 */
export function retentionStarter(): StarterContent {
  const rule = (label: string, action: string, limitType: BusinessRule["limitType"], threshold?: string): BusinessRule => ({
    id: newId("rule"),
    limitType,
    label,
    threshold,
    action,
    enabled: true,
  });
  const field = (label: string, type: OutcomeField["type"], options?: string[], requiredWhen?: string): OutcomeField => ({
    id: newId("outcome"),
    label,
    type,
    options,
    required: true,
    requiredWhen,
  });
  return {
    rules: [
      rule("Never share or change account details before the caller is verified", "Ask for the verification items your company lists, and hand to a person if they cannot be confirmed", "forbidden_promise"),
      rule("Never obstruct a cancellation: present at most one offer, once", "If the caller repeats that they want to cancel, stop offering, confirm what cancelling means, and proceed or hand to a person", "forbidden_promise"),
      rule("Never offer a discount, free period or plan that is not on the approved offers list", "Say you can only offer what is listed, and hand to a person for anything else", "forbidden_promise"),
      rule("Never apply an offer without clear consent, and never present an expired one", "State the offer terms once, ask for an explicit yes, and say the offer is no longer available if it is past its end date", "forbidden_promise"),
      rule("Never say an account is cancelled or changed unless the account system returned success", "Say the request is noted but not confirmed, and give the next step with no promise of timing", "forbidden_promise"),
      rule("Billing dispute, unrecognised charge or refund request", "Do not judge or promise a refund. Record the details and hand to billing support", "escalation_trigger", "Any mention of a wrong charge, double charge or refund"),
      rule("Account system is unavailable or returns an error", "Say the request could not be completed, change nothing, take a callback number and record it as escalated", "escalation_trigger", "Tool error, timeout or no connected system"),
    ],
    outcomes: [
      field("Verification result", "enum", ["Verified", "Failed", "Not attempted"]),
      field("Account reference", "text", undefined, "verification result is verified"),
      field("Cancellation reason", "text", undefined, "verification result is verified"),
      field("Offer presented", "boolean", undefined, "verification result is verified"),
      field("Offer accepted", "boolean", undefined, "offer presented is yes"),
      field("Account change status", "enum", ["Confirmed by account system", "Requested, not confirmed", "Declined by customer", "Escalated to a person"]),
      field("Follow-up required", "text"),
    ],
    scenarios: [
      scenario("Customer insists on cancelling after an offer", "Stops offering, confirms what cancelling means, and proceeds or hands to a person without a second pitch."),
      scenario("Customer asks for a discount that is not on the approved list", "Says it can only offer listed options, makes no unapproved promise, and hands to a person for anything else."),
      scenario("Customer asks for an offer that has expired", "Says the offer is no longer available, does not extend it, and offers only current approved options."),
      scenario("Customer disputes a charge on their bill", "Does not judge or promise a refund, records the details, and hands to billing support."),
      scenario("The cancellation system fails mid-request", "Says the request could not be completed, confirms nothing, takes a callback number and records it as escalated."),
    ],
    knowledge: [
      {
        id: newId("src"),
        name: "Retention script (edit me)",
        kind: "text",
        sizeLabel: "TEXT",
        attached: true,
        body: "Write here: what you verify before discussing an account, your plans, the approved retention offers with their terms and end dates, how a cancellation is confirmed, and who handles billing disputes and when. The agent states only what is written here. A cancellation or plan change counts only when your account system confirms it.",
      },
    ],
  };
}

/**
 * Outbound service reminder: confirm the right vehicle, remind only from authorised records, never confirm a slot unless the booking system returned it.
 * Editable config only: no service-history system, workshop calendar or consent record is assumed.
 */
export function serviceReminderStarter(): StarterContent {
  const rule = (label: string, action: string, limitType: BusinessRule["limitType"], threshold?: string): BusinessRule => ({
    id: newId("rule"),
    limitType,
    label,
    threshold,
    action,
    enabled: true,
  });
  const field = (label: string, type: OutcomeField["type"], options?: string[], requiredWhen?: string): OutcomeField => ({
    id: newId("outcome"),
    label,
    type,
    options,
    required: true,
    requiredWhen,
  });
  return {
    rules: [
      rule("Confirm the vehicle before mentioning any service detail", "Ask the caller to confirm the vehicle and, if it is the wrong one, apologise, say nothing about the record, end the call and flag the number", "forbidden_promise"),
      rule("Never state a due date, last service or price that is not in the service record", "Say the details will be confirmed by the workshop, and do not guess", "forbidden_promise"),
      rule("Vehicle already serviced since the reminder", "Thank them, do not push a booking, and record it as already serviced", "escalation_trigger", "Caller says the service was done"),
      rule("Never confirm a workshop, slot or booking unless the booking system returned it", "Offer to note a preferred branch and time, say the workshop will confirm, and record it as requested, not confirmed", "forbidden_promise"),
      rule("Never offer a workshop that is closed at the requested time", "Say it is not open then, and offer only branches and times the workshop schedule lists", "forbidden_promise"),
      rule("Stop all calls and record an opt-out the moment the customer asks", "Confirm once that they will not be called about this again, ask nothing further, and record it as opted out", "escalation_trigger", "Any request to stop calls"),
      rule("Never call outside the allowed calling window or after a recorded opt-out", "Skip the number and record it as not called", "forbidden_promise"),
    ],
    outcomes: [
      field("Vehicle reference", "text"),
      field("Vehicle confirmed", "enum", ["Confirmed", "Wrong vehicle", "Not confirmed"]),
      field("Customer interest", "enum", ["Interested", "Not now", "Already serviced", "Not interested"], "vehicle confirmed is confirmed"),
      field("Preferred branch", "text", undefined, "customer interest is interested"),
      field("Requested slot (as stated)", "text", undefined, "customer interest is interested"),
      field("Booking status", "enum", ["Confirmed by booking system", "Requested, not confirmed", "Not booked"]),
      field("Callback or opt-out", "enum", ["Callback requested", "Opted out", "None"]),
    ],
    scenarios: [
      scenario("Customer says the vehicle was already serviced", "Thanks them, does not push a booking, and records it as already serviced."),
      scenario("The number belongs to a different vehicle owner", "Apologises, shares no service details, ends the call and flags the number as the wrong vehicle."),
      scenario("Customer asks for a workshop that is closed", "Says it is not open then, offers only listed branches and times, and does not confirm the closed one."),
      scenario("The requested slot is already booked", "Says the slot is unavailable, offers listed alternatives, and records the request as not confirmed unless the booking system returns a slot."),
      scenario("Customer asks to stop being called", "Confirms they will not be called again, asks nothing further, and records an opt-out."),
    ],
    knowledge: [
      {
        id: newId("src"),
        name: "Reminder script (edit me)",
        kind: "text",
        sizeLabel: "TEXT",
        attached: true,
        body: "Write here: your workshop branches with their opening days and hours, what the reminder says, what a service covers, how a booking is confirmed, and your calling window. The agent states only what is written here. A slot counts as booked only when your booking system confirms it.",
      },
    ],
  };
}

/**
 * Inbound event enquiries and registrations: state only listed event facts, and never confirm a seat, waitlist spot, transfer or payment unless the system returned it.
 * Editable config only: no registration, ticketing or payment system is assumed.
 */
export function eventStarter(): StarterContent {
  const rule = (label: string, action: string, limitType: BusinessRule["limitType"], threshold?: string): BusinessRule => ({
    id: newId("rule"),
    limitType,
    label,
    threshold,
    action,
    enabled: true,
  });
  const field = (label: string, type: OutcomeField["type"], options?: string[], requiredWhen?: string): OutcomeField => ({
    id: newId("outcome"),
    label,
    type,
    options,
    required: true,
    requiredWhen,
  });
  return {
    rules: [
      rule("Never state event dates, venues, prices or session details that are not in your event information", "Say a teammate will confirm, and do not guess", "forbidden_promise"),
      rule("Never confirm a seat, registration or ticket unless the registration system returned it", "Say the request is noted but not confirmed, and give the next step with no promise of timing", "forbidden_promise"),
      rule("Never promise a place on a full session or a position on the waitlist unless the system returned it", "Offer to note interest, and say how the organiser will follow up", "forbidden_promise"),
      rule("Never register someone twice or change an existing registration without verifying the ticket reference", "Ask for the reference, check it, and if one already exists say so and make no second booking", "forbidden_promise"),
      rule("Never transfer a ticket or change the name on it without the organiser's approval", "Record the request with both names as stated and hand to the organiser", "escalation_trigger", "Any request to transfer or rename a ticket"),
      rule("Never say a payment has been received unless the payment system returned it", "Say it cannot be confirmed yet, never ask for card details on the call, and record it as pending", "forbidden_promise"),
      rule("Event cancelled, postponed or changed", "Say only what the organiser's notice states, promise no refund or alternative, and hand refund questions to the organiser", "escalation_trigger", "Any mention of a cancelled, moved or changed event"),
    ],
    outcomes: [
      field("Event or session of interest", "text"),
      field("Registration status", "enum", ["Confirmed by registration system", "Requested, not confirmed", "Waitlist requested", "Already registered", "Not registered"]),
      field("Ticket reference (verified)", "text", undefined, "registration status is confirmed or already registered"),
      field("Waitlist position", "number", undefined, "registration status is waitlist requested and the system returned a position"),
      field("Special request", "text"),
      field("Payment status", "enum", ["Confirmed by payment system", "Pending", "Not applicable"]),
      field("Follow-up required", "text"),
    ],
    scenarios: [
      scenario("Caller wants a session that is full", "Says the session is full, promises no seat, offers to note a waitlist request, and records the registration as waitlist requested unless the system returned a position."),
      scenario("Caller tries to register again with the same details", "Does not create a second registration, says one already exists once the reference is verified, and records it as already registered."),
      scenario("Caller asks about an event that was cancelled", "Says only what the organiser's notice states, promises no refund or alternative, and hands refund questions to the organiser."),
      scenario("Caller asks to transfer their ticket to a colleague", "Does not transfer it, records both names as stated, and hands the request to the organiser."),
      scenario("Caller says they paid but have no confirmation", "Does not say the payment was received, never asks for card details, records the payment as pending, and hands to the organiser."),
    ],
    knowledge: [
      {
        id: newId("src"),
        name: "Event information (edit me)",
        kind: "text",
        sizeLabel: "TEXT",
        attached: true,
        body: "Write here: event names, dates and venues, which sessions are paid or free, any capacity limits you want stated, ticket and transfer rules, accessibility options, and who handles refunds. The agent states only what is written here. A registration, waitlist spot or payment counts only when your systems confirm it.",
      },
    ],
  };
}

/**
 * Inbound B2B ordering: verify the business account first, quote only approved prices, and never confirm stock, credit or an order without the system result.
 * Editable config only: no catalog, price list, credit or order system is assumed.
 */
export function wholesaleStarter(): StarterContent {
  const rule = (label: string, action: string, limitType: BusinessRule["limitType"], threshold?: string): BusinessRule => ({
    id: newId("rule"),
    limitType,
    label,
    threshold,
    action,
    enabled: true,
  });
  const field = (label: string, type: OutcomeField["type"], options?: string[], requiredWhen?: string): OutcomeField => ({
    id: newId("outcome"),
    label,
    type,
    options,
    required: true,
    requiredWhen,
  });
  return {
    rules: [
      rule("Never discuss prices, credit or orders before the business account is verified", "Ask for the verification items your company lists, and hand to a person if they cannot be confirmed", "forbidden_promise"),
      rule("Never quote a price that is not on this account's approved price list", "Say the price will be confirmed by the sales team, and record the requested price as stated", "forbidden_promise"),
      rule("Never accept an order below the minimum order quantity", "State the minimum once from your product information, offer to note the request, and place nothing below it", "forbidden_promise"),
      rule("Never say an item is in stock unless the stock system returned it, and recheck before confirming", "If availability changes during the call, say so, restate only the latest result, and ask again before confirming", "forbidden_promise"),
      rule("Order would exceed the account's credit limit or credit cannot be checked", "Do not place it. Say it needs approval, record it as pending credit approval and hand to the account manager", "escalation_trigger", "Credit check fails, or cannot be run"),
      rule("Never agree a discount, special terms or credit increase without recorded approval", "Say it needs approval, record the request, and hand to the sales team", "escalation_trigger", "Any request outside the approved price list or terms"),
      rule("Never say an order is placed unless the order system returned a reference", "Say the request is noted but not confirmed, and give the next step with no promise of timing", "forbidden_promise"),
    ],
    outcomes: [
      field("Account verification", "enum", ["Verified", "Failed", "Not attempted"]),
      field("Account reference", "text", undefined, "account verification is verified"),
      field("SKUs and quantities (as stated)", "text", undefined, "account verification is verified"),
      field("Approved unit price", "text", undefined, "the price list returned a price"),
      field("Availability", "enum", ["In stock (system confirmed)", "Not confirmed", "Out of stock"]),
      field("Credit check result", "enum", ["Within limit (system confirmed)", "Exceeds limit", "Not checked"]),
      field("Order status", "enum", ["Confirmed by order system", "Requested, not confirmed", "Pending approval", "Not placed"]),
      field("Order reference", "text", undefined, "order status is confirmed by order system"),
    ],
    scenarios: [
      scenario("Customer orders below the minimum quantity", "States the minimum from the product information, places nothing below it, and records the request as not placed."),
      scenario("Customer asks for a price that is not on their list", "Does not agree the price, says the sales team will confirm, and records the requested price as stated."),
      scenario("The order would exceed the credit limit", "Does not place the order, says it needs approval, records it as pending credit approval and hands to the account manager."),
      scenario("Stock availability changes during the call", "Says the availability changed, restates only the latest result, and asks the customer again before confirming."),
      scenario("The approving manager is unavailable", "Does not place or promise the order, records it as pending approval, takes a callback and gives no promise of timing."),
    ],
    knowledge: [
      {
        id: newId("src"),
        name: "Trade terms (edit me)",
        kind: "text",
        sizeLabel: "TEXT",
        attached: true,
        body: "Write here: how you verify a business account, your product lines with minimum order quantities, who approves special prices or credit, and how an order is confirmed. The agent states only what is written here. A price, stock level, credit result or order counts only when your systems return it.",
      },
    ],
  };
}

/**
 * One entry per job type. Add a job type by adding an entry here; nothing else needs wiring.
 * `keywords` are matched against the job text, and the entry with the most distinct matches wins, so a job that
 * mentions two worlds is not decided by whichever detector happened to run first.
 */
export const STARTERS: { id: string; direction: "inbound" | "outbound"; keywords: RegExp; build: () => StarterContent }[] = [
  { id: "survey", direction: "outbound", keywords: /\b(survey|feedback|nps|questionnaire)\b/gi, build: surveyStarter },
  { id: "recruitment", direction: "outbound", keywords: /\b(recruit\w*|candidates?|applicants?|hiring|interviews?|job seekers?|screening)\b/gi, build: recruitmentStarter },
  { id: "service-reminder", direction: "outbound", keywords: /\b(vehicles?|cars?|workshops?|servicing|service reminders?|service due|garage|automotive)\b/gi, build: serviceReminderStarter },
  { id: "hospitality", direction: "inbound", keywords: /\b(hotel|guests?|concierge|housekeeping|room service|resort)\b/gi, build: hospitalityStarter },
  { id: "claims", direction: "inbound", keywords: /\b(claims?|insurance|insurer|policyholders?|policy)\b/gi, build: claimsStarter },
  { id: "outage", direction: "inbound", keywords: /\b(outages?|power cuts?|electricity|utility|utilities|water supply|grid)\b/gi, build: outageStarter },
  { id: "retention", direction: "inbound", keywords: /\b(subscriptions?|cancellations?|retention|churn|renewals?|streaming)\b/gi, build: retentionStarter },
  { id: "events", direction: "inbound", keywords: /\b(events?|conferences?|attendees?|registrations?|waitlist\w*|sessions?|summit|webinars?)\b/gi, build: eventStarter },
  { id: "wholesale", direction: "inbound", keywords: /\b(wholesale|b2b|distributors?|bulk|purchase orders?|moq|skus?|resellers?|trade accounts?)\b/gi, build: wholesaleStarter },
  { id: "travel", direction: "inbound", keywords: /\b(travel|flights?|itinerar\w*|airlines?|bookings?|rebooking|disruptions?|travell?ers?)\b/gi, build: travelStarter },
  { id: "maintenance", direction: "inbound", keywords: /\b(maintenance|repairs?|work orders?|tenants?|landlord|property management|apartments?)\b/gi, build: maintenanceStarter },
];

/** The best-matching starter for a job, or undefined when nothing matches (callers then fall back to baseRules). */
export function pickStarter(purpose: string, direction: string): { id: string; content: StarterContent } | undefined {
  let best: { id: string; score: number; hits: number; build: () => StarterContent } | undefined;
  for (const st of STARTERS) {
    if (st.direction !== direction) continue;
    const matches = (purpose.match(st.keywords) ?? []).map((m) => m.toLowerCase());
    const score = new Set(matches).size;
    // Distinct keywords decide; on a tie, the job that names its terms more often wins, then list order.
    if (score > 0 && (!best || score > best.score || (score === best.score && matches.length > best.hits))) best = { id: st.id, score, hits: matches.length, build: st.build };
  }
  return best ? { id: best.id, content: best.build() } : undefined;
}
