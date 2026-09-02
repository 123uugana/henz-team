import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ClerkTokenBridge } from "@/components/clerk-token-bridge";
import "./globals.css";

export const metadata: Metadata = {
  title: "Хэнц Хурга",
  description: "Таны сүрэг таны гар утсанд",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const content = clerkPublishableKey ? (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      signInUrl="/admin/login"
      signUpUrl="/admin/sign-up"
    >
      <ClerkTokenBridge />
      {children}
    </ClerkProvider>
  ) : (
    children
  );

  return (
    <html
      lang="mn"
      suppressHydrationWarning
      className="h-full antialiased font-sans"
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem("henz-hurga-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{content}</body>
    </html>
  );
}
