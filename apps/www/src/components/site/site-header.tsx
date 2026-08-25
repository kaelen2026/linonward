import { BrandMark } from "@/components/site/brand-mark";
import { LocaleSwitch } from "@/components/site/locale-switch";
import { Button } from "@/components/ui/button";
import type { SiteContent } from "@/content/site";
import type { Locale } from "@/lib/i18n";

export function SiteHeader({ locale, content }: { locale: Locale; content: SiteContent }) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-6">
        <BrandMark locale={locale} name={content.brand.name} />

        <nav aria-label={content.brand.tagline} className="hidden items-center gap-6 md:flex">
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

        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitch current={locale} label={content.footer.languageLabel} />
          <Button
            className="hidden sm:inline-flex"
            nativeButton={false}
            render={<a href="#contact" />}
            size="sm"
            variant="brand"
          >
            {content.hero.primaryCta}
          </Button>
        </div>
      </div>
    </header>
  );
}
