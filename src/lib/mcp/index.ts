import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listLeads from "./tools/list-leads";
import getLead from "./tools/get-lead";
import createLead from "./tools/create-lead";
import updateLeadStatus from "./tools/update-lead-status";
import listVisits from "./tools/list-visits";
import listFollowUps from "./tools/list-follow-ups";

// The OAuth issuer MUST be the direct Supabase host (not the .lovable.cloud proxy).
// See app-mcp-server-authoring: mcp-js validates the discovery issuer per RFC 8414.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "om-value-homes-crm",
  title: "Om Value Homes CRM",
  version: "0.1.0",
  instructions:
    "Tools for the Om Value Homes real-estate CRM. Read and manage the signed-in user's leads, site visits, and follow-ups. Every call runs as the user via Supabase RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listLeads, getLead, createLead, updateLeadStatus, listVisits, listFollowUps],
});