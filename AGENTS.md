# printflow-admin

Panel administrativo de PrintFlow AI (Imprenta Escalante). React 18 + Vite + TypeScript + Tailwind 4, conectado directo a Supabase (PostgREST + RPC + RLS; ver `printflow-api`).

## Uso

```bash
cp .env.example .env   # VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (nunca la service_role)
npm install
npm run dev            # http://localhost:5174
npm test && npm run typecheck && npm run build
```

Solo entra un perfil ADMIN activo. Las cuentas se crean en el dashboard de Supabase.

## Reglas
- El dinero es string decimal; el panel no suma: totales, saldos y anticipos los calcula la base.
- Toda escritura de dinero o estado pasa por `src/lib/rpc.ts`.
- Errores por código `PF_*` (`src/lib/errors.ts`), nunca por texto.
- Fechas en la zona operativa (`business_settings.timezone`).
- Colores solo con tokens semánticos (`src/styles/global.css`).
