import { ArrowRight, Check, Mail } from "lucide-react";
import { notFound } from "next/navigation";

import { Eyebrow } from "@/components/site/eyebrow";
import { GrowthChart } from "@/components/site/growth-chart";
import { FeatureIcon } from "@/components/site/icon";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { contactEmail, siteContent } from "@/content/site";
import { isLocale } from "@/lib/i18n";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const content = siteContent[locale];
  const { hero, friction, features, how, audience, closing } = content;

  return (
    <>
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100 focus:rounded-lg focus:bg-brand focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-foreground"
        href="#main"
      >
        {content.nav.skipToContent}
      </a>

      <SiteHeader content={content} locale={locale} />

      <main id="main">
        {/* ---------- Hero ---------- */}
        <section className="relative overflow-hidden border-b">
          <div aria-hidden="true" className="brand-wash absolute inset-0" />
          <div aria-hidden="true" className="brand-grid absolute inset-0 opacity-60" />

          <div className="relative mx-auto grid w-full max-w-6xl gap-14 px-6 py-20 sm:py-28 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <div className="space-y-7">
              <Eyebrow>{hero.eyebrow}</Eyebrow>

              <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                {hero.headlineLead}
                <span className="brand-gradient-text block">{hero.headlineAccent}</span>
              </h1>

              <p className="max-w-xl text-lg text-muted-foreground text-pretty">{hero.subhead}</p>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  nativeButton={false}
                  render={<a href="#contact" />}
                  size="lg"
                  variant="brand"
                >
                  {hero.primaryCta}
                  <ArrowRight data-icon="inline-end" />
                </Button>
                <Button nativeButton={false} render={<a href="#how" />} size="lg" variant="outline">
                  {hero.secondaryCta}
                </Button>
              </div>

              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check aria-hidden="true" className="size-4 text-teal-700 dark:text-teal-300" />
                {hero.note}
              </p>
            </div>

            <GrowthChart
              label={hero.chart.label}
              legendCurrent={hero.chart.legendCurrent}
              legendPrior={hero.chart.legendPrior}
            />
          </div>
        </section>

        {/* ---------- The problem ---------- */}
        <section className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
          <div className="max-w-3xl space-y-4">
            <Eyebrow>{friction.eyebrow}</Eyebrow>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {friction.heading}
            </h2>
          </div>

          <ul className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {friction.items.map((item, index) => (
              <li className="border-t pt-6" key={item.title}>
                <span className="font-mono text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="font-heading mt-3 text-lg font-medium">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground text-pretty">{item.description}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- Platform ---------- */}
        <section className="border-y bg-muted/40" id="platform">
          <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
            <div className="max-w-3xl space-y-4">
              <Eyebrow>{features.eyebrow}</Eyebrow>
              <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                {features.heading}
              </h2>
              <p className="text-lg text-muted-foreground text-pretty">{features.subhead}</p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.items.map((item) => (
                <Card key={item.title}>
                  <CardHeader>
                    <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-brand-subtle text-brand-subtle-foreground">
                      <FeatureIcon className="size-4.5" name={item.icon} />
                    </div>
                    {/* biome-ignore lint/a11y/useHeadingContent: the <h3> is a render template — useRender injects `item.title` as its children, and the rendered DOM has text. */}
                    <CardTitle render={<h3 />}>{item.title}</CardTitle>
                    <CardDescription className="text-pretty">{item.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- How it works ---------- */}
        <section className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24" id="how">
          <div className="max-w-3xl space-y-4">
            <Eyebrow>{how.eyebrow}</Eyebrow>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {how.heading}
            </h2>
          </div>

          <ol className="relative mt-12 grid gap-10 sm:grid-cols-3 sm:gap-6">
            {/* The rail the steps sit on, echoing the rise in the mark. */}
            <div
              aria-hidden="true"
              className="absolute top-4 right-0 left-0 hidden h-px bg-gradient-to-r from-navy-300 via-teal-400 to-teal-500 sm:block dark:from-navy-700 dark:via-teal-600 dark:to-teal-400"
            />
            {how.steps.map((step, index) => (
              <li className="relative sm:pr-6" key={step.title}>
                <span className="relative flex size-8 items-center justify-center rounded-full bg-brand font-mono text-xs font-medium text-brand-foreground ring-4 ring-background">
                  {index + 1}
                </span>
                <h3 className="font-heading mt-4 text-lg font-medium">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground text-pretty">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- Who it's for ---------- */}
        <section className="border-y bg-muted/40" id="audience">
          <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
            <div className="max-w-3xl space-y-4">
              <Eyebrow>{audience.eyebrow}</Eyebrow>
              <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                {audience.heading}
              </h2>
            </div>

            <dl className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {audience.items.map((item) => (
                <div className="border-l-2 border-brand pl-5" key={item.role}>
                  <dt className="text-sm font-medium text-muted-foreground">{item.role}</dt>
                  <dd className="font-heading mt-1.5 text-lg text-pretty">{item.question}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ---------- Closing ---------- */}
        <section className="relative overflow-hidden" id="contact">
          <div aria-hidden="true" className="brand-wash absolute inset-0" />
          <div className="relative mx-auto w-full max-w-3xl px-6 py-24 text-center sm:py-32">
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {closing.heading}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground text-pretty">
              {closing.body}
            </p>
            <div className="mt-8 flex flex-col items-center gap-5">
              <Button
                nativeButton={false}
                render={
                  <a
                    href={`mailto:${contactEmail}?subject=${encodeURIComponent(closing.demoSubject)}`}
                  />
                }
                size="lg"
                variant="brand"
              >
                {closing.primaryCta}
                <ArrowRight data-icon="inline-end" />
              </Button>
              <p className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
                <Mail aria-hidden="true" className="size-4" />
                {closing.secondaryCta}
                <a
                  className="font-mono text-foreground underline decoration-brand decoration-2 underline-offset-4"
                  href={`mailto:${contactEmail}`}
                >
                  {contactEmail}
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter content={content} locale={locale} />
    </>
  );
}
