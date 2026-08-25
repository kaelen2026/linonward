import { BrandMark } from "@/components/site/brand-mark";
import { LocaleSwitch } from "@/components/site/locale-switch";
import { contactEmail, type SiteContent } from "@/content/site";
import type { Locale } from "@/lib/i18n";

export function SiteFooter({ locale, content }: { locale: Locale; content: SiteContent }) {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-14">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm space-y-3">
            <BrandMark locale={locale} name={content.brand.name} />
            <p className="text-sm text-muted-foreground text-pretty">{content.footer.blurb}</p>
          </div>

          <div className="flex flex-col gap-6 sm:items-end">
            <nav aria-label={content.brand.tagline} className="flex flex-wrap gap-x-6 gap-y-2">
              {content.nav.items.map((item) => (
                <a
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <LocaleSwitch current={locale} label={content.footer.languageLabel} />
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {content.brand.name}. {content.footer.rights}
          </p>
          <a
            className="font-mono text-xs transition-colors hover:text-foreground"
            href={`mailto:${contactEmail}`}
          >
            {contactEmail}
          </a>
        </div>
      </div>
    </footer>
  );
}
