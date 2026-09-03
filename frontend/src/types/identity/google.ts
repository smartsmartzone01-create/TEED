type GoogleCredentialResponse = {
  credential: string;
  select_by?: string;
};

type GoogleIdentityConfiguration = {
  callback: (response: GoogleCredentialResponse) => void;
  client_id: string;
};

type GoogleButtonConfiguration = {
  locale?: string;
  logo_alignment?: "left" | "center";
  shape?: "rectangular" | "pill" | "circle" | "square";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  theme?: "outline" | "filled_blue" | "filled_black";
  type?: "standard" | "icon";
  width?: string;
};

type GoogleIdentityService = {
  initialize: (configuration: GoogleIdentityConfiguration) => void;
  renderButton: (
    parent: HTMLElement,
    configuration: GoogleButtonConfiguration,
  ) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleIdentityService;
      };
    };
  }
}

export type {
  GoogleButtonConfiguration,
  GoogleCredentialResponse,
  GoogleIdentityConfiguration,
  GoogleIdentityService,
};
