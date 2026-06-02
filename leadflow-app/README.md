# ⚡ LeadFlow

Webapp MVP para generación automatizada de leads B2B. Conecta con Apollo.io vía n8n para buscar empresas y contactos según tu ICP (Ideal Customer Profile).

## Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Auth & DB:** Supabase
- **Styling:** Tailwind CSS
- **Orquestación:** n8n (webhook)
- **Fuente de leads:** Apollo.io API

## Setup rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Edita .env con tus valores de Supabase y n8n

# 3. Correr en desarrollo
npm run dev
```

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL de tu proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Llave pública (anon/publishable) de Supabase |
| `VITE_N8N_WEBHOOK_URL` | URL del webhook de n8n que recibe el ICP |

## Flujo

1. Usuario se registra/logea (Supabase Auth)
2. Llena formulario ICP (industria, cargos, país, seniority, min empleados)
3. Envía → webhook POST a n8n
4. n8n busca en Apollo, enriquece, genera Excel
5. Usuario recibe Excel por email

## Deploy en Vercel

1. Conecta este repo en [vercel.com](https://vercel.com)
2. Agrega las variables de entorno en Settings → Environment Variables
3. Deploy automático en cada push

## Estructura

```
src/
├── App.tsx              # Router principal + auth state
├── main.tsx             # Entry point
├── index.css            # Tailwind + animaciones
├── lib/
│   └── supabase.ts      # Cliente Supabase
├── components/
│   └── TagInput.tsx      # Input de tags reutilizable
└── pages/
    ├── Login.tsx         # Login/Signup con Supabase Auth
    ├── Dashboard.tsx     # Formulario ICP + envío webhook
    └── Success.tsx       # Confirmación + resumen
```

---

Construido por MindLytics © 2026
