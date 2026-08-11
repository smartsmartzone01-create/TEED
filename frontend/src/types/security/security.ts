type SecurityEvent = { id: string; event_type: string; outcome: "blocked" | "failure" | "success"; occurred_at: string; ip_address: string; current_session: boolean };
type SecurityOverview = { verified_contacts: { email: boolean; phone: boolean }; active_session_count: number; recovery: { email_available: boolean; phone_available: boolean }; recent_activity: SecurityEvent[] };
type SecuritySession = { id: string; current: boolean; device_label: string; browser: string; operating_system: string; ip_address: string; created_at: string; last_seen_at: string; expires_at: string };
export type { SecurityEvent, SecurityOverview, SecuritySession };
