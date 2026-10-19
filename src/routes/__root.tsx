import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { useEffect } from "react";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { DalalaContactHub } from "@/components/dalala/contact-ai";
import appCss from "../styles.css?url";

function PwaBoot() {
  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "BULTUM COMPANY" },
      { name: "description", content: "BULTUM COMPANY — cars, trucks, machinery and agricultural equipment across Ethiopia." },
      { name: "theme-color", content: "#12110E" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/icons/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/bultum-icon-180.png" },
    ],
  }),
  component: () => (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-ivory text-ink">
        <PwaBoot />
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
          <DalalaContactHub />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
