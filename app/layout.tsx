import "./globals.css";

// app/layout.tsx
export const metadata = {
  title: "Christelle",
  description: "Easy drag-and-drop tetris puzzle game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "sans-serif" }}>{children}</body>
    </html>
  );
}
