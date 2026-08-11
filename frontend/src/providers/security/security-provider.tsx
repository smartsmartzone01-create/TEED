"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { ApiClientError } from "@/services/global/api-client";
import * as api from "@/services/security/security";
import type { SecurityEvent, SecurityOverview, SecuritySession } from "@/types/security/security";

type Context = { overview: SecurityOverview | null; sessions: SecuritySession[]; events: SecurityEvent[]; loading: boolean; error: Error | null; refresh: () => Promise<void>; changePassword: (v: {current_password:string;new_password:string;confirm_password:string}) => Promise<void>; revoke: (id:string)=>Promise<void>; revokeOthers:()=>Promise<void> };
const SecurityContext = createContext<Context | null>(null);
function SecurityProvider({children}:{children:ReactNode}) {
  const {accessToken, clearSession, refreshAccessToken} = useIdentitySession();
  const [overview,setOverview]=useState<SecurityOverview|null>(null); const [sessions,setSessions]=useState<SecuritySession[]>([]); const [events,setEvents]=useState<SecurityEvent[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState<Error|null>(null);
  const withToken=useCallback(async<T,>(fn:(token:string)=>Promise<T>)=>{ if(!accessToken) throw new Error("Authentication required."); try{return await fn(accessToken)}catch(e){if(!(e instanceof ApiClientError)||e.details.kind!=="unauthenticated")throw e; try{return await fn(await refreshAccessToken())}catch(next){clearSession();throw next}}},[accessToken,clearSession,refreshAccessToken]);
  const refresh=useCallback(async()=>{setLoading(true);setError(null);try{const [o,s,a]=await Promise.all([withToken(api.getOverview),withToken(api.getSessions),withToken(api.getActivity)]);setOverview(o.data??null);setSessions(s.data?.sessions??[]);setEvents(a.data?.events??[])}catch(e){setError(e instanceof Error?e:new Error("Security request failed."))}finally{setLoading(false)}},[withToken]);
  useEffect(()=>{if(accessToken){const id=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(id)}},[accessToken,refresh]);
  const value=useMemo<Context>(()=>({overview,sessions,events,loading,error,refresh,changePassword:async(v)=>{await withToken(t=>api.changePassword(t,v));await refresh()},revoke:async(id)=>{await withToken(t=>api.revokeSession(t,id));await refresh()},revokeOthers:async()=>{await withToken(api.revokeOtherSessions);await refresh()}}),[overview,sessions,events,loading,error,refresh,withToken]);
  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
}
function useSecurity(){const value=useContext(SecurityContext);if(!value)throw new Error("useSecurity must be used inside SecurityProvider.");return value}
export {SecurityProvider,useSecurity};
