import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "@repo/ui/globals.css";
import { TooltipProvider } from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

const fontSans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
	title: "Polygon Manager",
	description: "Create, display, and delete persisted polygons over an image canvas.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning className={cn("antialiased", fontSans.variable, fontMono.variable)}>
			<body>
				<ThemeProvider>
					<TooltipProvider>{children}</TooltipProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
