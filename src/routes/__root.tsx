import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0f4c4a" },
      { title: "Gestão de Custos - Labor Rural" },
      { name: "description", content: "Gestão de custos operacionais agrícolas da Labor Rural. Lançamentos rápidos em campo, relatórios e exportação XLSX/PDF." },
      { name: "author", content: "Labor Rural" },
      { property: "og:title", content: "Gestão de Custos - Labor Rural" },
      { property: "og:description", content: "Gestão de custos operacionais agrícolas da Labor Rural. Lançamentos rápidos em campo, relatórios e exportação XLSX/PDF." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Gestão de Custos - Labor Rural" },
      { name: "twitter:description", content: "Gestão de custos operacionais agrícolas da Labor Rural. Lançamentos rápidos em campo, relatórios e exportação XLSX/PDF." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/df8a7f3e-c21d-484f-8930-da6b189f9ccf/id-preview-9253f784--0b7bd942-21b9-47fb-8053-74d4fc51d96c.lovable.app-1776991109814.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/df8a7f3e-c21d-484f-8930-da6b189f9ccf/id-preview-9253f784--0b7bd942-21b9-47fb-8053-74d4fc51d96c.lovable.app-1776991109814.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/logo-labor-rural.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/logo-labor-rural.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
