import type { WorkspaceType } from "@/types/workspace/workspace";

type WorkspaceClass = "business" | "personal";

function workspaceClassForType(type: WorkspaceType): WorkspaceClass {
  return type === "personal_brand" ? "personal" : "business";
}

function workspaceTypeForClass(value: WorkspaceClass): WorkspaceType {
  return value === "personal" ? "personal_brand" : "business";
}

function workspaceSupportsMemberships(type: WorkspaceType) {
  return workspaceClassForType(type) === "business";
}

export {
  workspaceClassForType,
  workspaceSupportsMemberships,
  workspaceTypeForClass,
};
export type { WorkspaceClass };
