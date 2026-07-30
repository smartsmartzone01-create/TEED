type ProfileCompletion = {
  completed_fields: number;
  percentage: number;
  total_required_fields: number;
};

type ProfilePrompt = {
  destination: string;
  key: string;
  optional: boolean;
};

type ProfileOverview = {
  completion: ProfileCompletion;
  prompts: ProfilePrompt[];
  quick_links: string[];
  verified_contacts: {
    email: boolean;
    phone: boolean;
  };
};

type PersonalInformation = {
  country_code: string;
  created_at: string;
  email: string | null;
  first_name: string;
  id: string;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  last_name: string;
  phone_number: string | null;
  profile_image_url: string | null;
  region: string;
  username: string | null;
};

type ContactDetail = {
  managed_by: string;
  purposes: string[];
  recovery_available: boolean;
  value: string | null;
  verified: boolean;
};

type ContactInformation = {
  email: ContactDetail;
  phone: ContactDetail;
};

type ProfileUpdateValues = {
  countryCode: "KE" | "TZ" | "UG";
  firstName: string;
  lastName: string;
  profileImage?: FileList;
  region: string;
  username: string;
};

export type {
  ContactDetail,
  ContactInformation,
  PersonalInformation,
  ProfileOverview,
  ProfilePrompt,
  ProfileUpdateValues,
};
