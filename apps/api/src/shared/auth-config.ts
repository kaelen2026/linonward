export type AuthConfig = {
  baseUrl: string;
  emailFrom: string;
  google:
    | {
        clientId: string;
        clientSecret: string;
        /**
         * Google refuses to redirect a web client to a custom URL scheme, so
         * `apps/ios` runs its own OAuth client and the id token it presents
         * carries that client as its audience. Absent leaves Google sign-in
         * working in the browser and refused from the app.
         */
        iosClientId: string | undefined;
      }
    | undefined;
  resendApiKey: string;
  secret: string;
};
