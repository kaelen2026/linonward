import { SiteHeader } from "@/components/site/site-header";

type PublicHeaderProps = {
  pathname?: string;
  user?: {
    email: string;
    image?: string | null;
    name: string;
  };
};

export function PublicHeader({ pathname = "/", user }: PublicHeaderProps) {
  return <SiteHeader pathname={pathname} user={user} />;
}
