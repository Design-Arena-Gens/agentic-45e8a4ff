export const metadata = {
  title: "Minimal Expense Tracker",
  description: "Track expenses with a minimalist UI"
};

import "./globals.css";
import { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <header className="header">
            <h1>Expenses</h1>
          </header>
          <main>{children}</main>
          <footer className="footer">Minimal Expense Tracker</footer>
        </div>
      </body>
    </html>
  );
}
