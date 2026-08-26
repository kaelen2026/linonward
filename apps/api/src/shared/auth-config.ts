export type AuthConfig = {
  baseUrl: string;
  emailFrom: string;
  google: { clientId: string; clientSecret: string } | undefined;
  resendApiKey: string;
  secret: string;
};
