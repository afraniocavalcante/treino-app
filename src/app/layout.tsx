import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Treino A/B",
  description: "App de treino A/B com progressão de carga",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Treino A/B",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#F5EFE3",
};

// Aplica o perfil de cor salvo antes do primeiro paint — sem isso, a página
// sempre nasceria no tema Clássico e só trocaria pro tema salvo um instante
// depois (flash visível). Precisa ser um script bloqueante inline porque
// nenhum módulo React roda antes do primeiro paint.
const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("color-theme");if(t&&t!=="classico")document.documentElement.setAttribute("data-theme",t);}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
