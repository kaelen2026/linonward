import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const stack = [
  {
    title: "Turborepo",
    description: "Task graph, remote-cacheable builds across every workspace.",
  },
  {
    title: "Next.js App Router",
    description: "React Server Components, typed routes, streaming by default.",
  },
  {
    title: "Tailwind CSS + shadcn/ui",
    description: "Design tokens in CSS variables, components owned in-repo.",
  },
  {
    title: "Biome",
    description: "One binary for lint and format, wired into staged-file hooks.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col justify-center gap-12 px-6 py-24">
      <header className="space-y-4">
        <Badge variant="secondary">monorepo</Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Linonward
        </h1>
        <p className="text-muted-foreground max-w-prose text-lg text-pretty">
          The official website, built in a pnpm workspace driven by Turborepo.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            render={<a href="https://turborepo.com" rel="noreferrer noopener" target="_blank" />}
            size="lg"
          >
            Turborepo docs
          </Button>
          <Button
            render={<a href="https://ui.shadcn.com" rel="noreferrer noopener" target="_blank" />}
            size="lg"
            variant="outline"
          >
            shadcn/ui
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {stack.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground font-mono text-xs">apps/www</CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
