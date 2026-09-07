type WorkspaceSearchResultType = "available_product" | "stock_receipt";
type WorkspaceSearchScope = "all" | "available_products" | "stock";
type WorkspaceSearchSectionKey = "available_products" | "stock";

type WorkspaceSearchResult = {
  type: WorkspaceSearchResultType;
  id: string;
  reference: string;
  title: string;
  subtitle: string;
  status: string;
  module: string;
  metadata: Record<string, unknown>;
};

type WorkspaceSearchSection = {
  key: WorkspaceSearchSectionKey;
  module: string;
  results: WorkspaceSearchResult[];
};

type WorkspaceSearchData = {
  query: string;
  scope: WorkspaceSearchScope;
  sections: WorkspaceSearchSection[];
};

export type {
  WorkspaceSearchData,
  WorkspaceSearchResult,
  WorkspaceSearchResultType,
  WorkspaceSearchScope,
  WorkspaceSearchSection,
  WorkspaceSearchSectionKey,
};
