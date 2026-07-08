# Kuenta — control de ingresos, gastos y ahorros

App móvil (Expo / React Native) para llevar el control rápido de ingresos, gastos y ahorros, tanto para uso personal como para una pyme. Permite tener varios "workspaces" (ej. Personal y Mi Negocio) y ver cuánto entró, cuánto se gastó y cuánto se ahorró cada mes.

## Modo demo (datos falsos, sin backend)

Por defecto el proyecto viene configurado en **modo demo**: no necesitas crear nada en Supabase para probar la app. Al entrar puedes registrarte con cualquier correo y contraseña, y verás datos de ejemplo ya cargados (ingresos, gastos y ahorros de los últimos 6 meses, en un workspace "Personal" y otro "Mi Pyme"). Los cambios que hagas (agregar/eliminar movimientos o categorías) solo viven en memoria mientras la app está abierta — al recargar, vuelve a los datos de ejemplo.

Esto se controla con la variable `EXPO_PUBLIC_DEMO_MODE` en el archivo `.env` (raíz del proyecto):

```
EXPO_PUBLIC_DEMO_MODE=true   # datos falsos, no necesita Supabase
EXPO_PUBLIC_DEMO_MODE=false  # usa tu backend real de Supabase (ver abajo)
```

## Requisitos

- Node.js (ya instalado con `nvm install --lts`)
- La app **Expo Go** en tu celular ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)) para probarla sin instalar nada más.
- Solo si vas a usar datos reales: una cuenta gratuita en [supabase.com](https://supabase.com).

## Correr la app

```bash
npm install
npx expo start
```

Escanea el código QR con la app **Expo Go** desde tu celular (Android: escanear directo; iOS: usar la cámara del celular). También puedes presionar `w` en la terminal para abrir una versión web de la app mientras desarrollas.

## Cuando quieras pasar a datos reales (Supabase)

1. Entra a [supabase.com](https://supabase.com), crea una cuenta y un **New Project** (elige una región cercana y una contraseña de base de datos).
2. Cuando el proyecto esté listo, ve a **SQL Editor** (menú lateral) → **New query**.
3. Copia todo el contenido de [`supabase/schema.sql`](./supabase/schema.sql), pégalo ahí y dale **Run**. Esto crea las tablas, la seguridad por usuario (RLS) y las categorías por defecto que se asignan a cada workspace nuevo.
4. Ve a **Project Settings → API**. Copia:
   - **Project URL**
   - **anon public key**
5. En el archivo `.env` de la raíz del proyecto, cambia `EXPO_PUBLIC_DEMO_MODE=true` a `EXPO_PUBLIC_DEMO_MODE=false`, y pega tu URL y tu anon key en `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
6. (Opcional pero recomendado) En **Authentication → Providers → Email**, puedes desactivar "Confirm email" mientras pruebas, para no depender de que lleguen los correos de confirmación.
7. Reinicia `npx expo start`.

## Flujo de uso

1. Crea una cuenta (Registrarme). Al crearla, automáticamente se genera tu workspace **Personal** con categorías por defecto.
2. Desde **Ajustes**, puedes crear un segundo workspace de tipo **Negocio** (ej. "Mi Pyme") y cambiar entre ambos con el selector en la parte superior del Resumen.
3. En **Resumen**, usa los botones grandes **+ Ingreso / + Gasto / + Ahorro** para registrar movimientos en 2-3 toques.
4. En **Movimientos** puedes filtrar por mes y por tipo, y mantener presionado un movimiento para eliminarlo.
5. En **Reportes** ves el desglose por categoría del mes y la comparación de los últimos 6 meses.
6. En **Consejos** la app analiza tus movimientos y deudas y te muestra alertas y sugerencias tipo: sobregasto en una categoría, riesgo de quedarte sin caja, cuánto podrías ahorrar sin tocar lo esencial, qué deuda te conviene pagar primero, y cuánto podrías invertir. Se calculan localmente con reglas (no es una IA generativa real todavía). Desde ahí, el botón **"Pregúntale algo a Kuenta"** abre un chat donde puedes escribir preguntas libres como "¿en qué gasté más este mes?", "¿cuánto he ahorrado?" o "¿puedo comprar algo de $X?" y te responde con tus datos reales.
7. En **Ajustes** puedes administrar tus categorías, registrar tus deudas/tarjetas (para que el consejo de prioridad de pago funcione) y cerrar sesión.

## Fuera de alcance de esta primera versión

- Invitar miembros/empleados a un workspace de negocio (la base de datos ya está preparada para esto con `workspace_members`, falta la pantalla de invitación).
- Modo 100% sin conexión con cola de sincronización.
- Notificaciones push y exportar reportes a Excel/PDF.
- Los consejos de la pestaña **Consejos** y las respuestas del **chat financiero** son heurísticas locales (reconocen patrones de preguntas comunes y calculan la respuesta con tus datos), no llamadas a un modelo de IA real — se decidió así para no depender de una llave de API de pago ni de un backend. El chat solo entiende preguntas parecidas a los ejemplos sugeridos; si no reconoce la pregunta, lo dice en vez de inventar una respuesta. Si más adelante quieres que un modelo de lenguaje real (ej. Claude) redacte las respuestas, se puede conectar vía una Supabase Edge Function que reciba la pregunta y tus datos, y llame a la API de forma segura.
