import { cn } from "@/lib/utils";

// Wordmark provisório enquanto o logo oficial da Vai Já não é fornecido
// (secção 2 da especificação pede para usar o logo do proprietário do
// projeto como referência visual). Substituir por <Image> assim que o
// ficheiro do logo for adicionado em public/branding/.
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline font-extrabold tracking-tight", className)}>
      <span className="text-foreground">Vai</span>
      <span className="ml-1.5 text-brand-yellow">Já</span>
    </span>
  );
}
