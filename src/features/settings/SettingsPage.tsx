// Configuración del negocio (D-07, D-08, M4-D-07 + configuración ampliada del
// 13/10/2026). Solo ADMIN (RLS). Organizada por secciones con ayuda breve.

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import toast from "react-hot-toast";
import { Building2, ClipboardList, Globe, LayoutDashboard, Package, Palette, ShieldCheck, type LucideIcon } from "lucide-react";
import { toAppError } from "../../lib/errors";
import { useSettingsStore } from "../../store/settings";
import { useThemeStore, type ThemePreference } from "../../store/theme";
import { parseQuantity } from "../../utils/quantity";
import { Button, SelectField, Spinner, TextAreaField, TextField } from "../../components/ui";
import { InfoTip } from "../../components/InfoTip";
import { PhoneField, type PhoneValue } from "../../components/PhoneField";
import { checkPhone, phoneMessage, splitStored } from "../../utils/phone";

const TIMEZONES = ["America/Mexico_City", "America/Monterrey", "America/Mazatlan", "America/Hermosillo", "America/Tijuana", "America/Cancun"];
const TZ_LABEL: Record<string, string> = {
  "America/Mexico_City": "Centro (CDMX, Guadalajara)",
  "America/Monterrey": "Monterrey",
  "America/Mazatlan": "Pacífico (Mazatlán, Culiacán)",
  "America/Hermosillo": "Sonora (sin horario de verano)",
  "America/Tijuana": "Noroeste (Tijuana)",
  "America/Cancun": "Sureste (Cancún)",
};

function Section({ icon: Icon, title, help, children }: { icon: LucideIcon; title: string; help: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-md border border-line bg-surface-0 p-4 md:p-6" aria-label={title}>
      <div className="flex items-start gap-2">
        <Icon size={20} aria-hidden className="mt-0.5 shrink-0 text-brand-accent" />
        <div>
          <h2 className="text-base font-bold text-ink-strong">{title}</h2>
          <p className="text-xs text-ink-muted">{help}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

const blank = (v: string) => (v.trim() ? v.trim() : null);

/** La base exige https:// en los enlaces de la landing: se renderizan como href
    en una pagina publica y el check cierra la puerta a javascript: y data:. */
const HTTPS = /^https:[/][/]/;

/** La página pública descarta un enlace a la portada de la red (sin perfil):
 *  "https://www.instagram.com/" abriría Instagram, no el negocio. */
function esPerfil(url: string): boolean {
  try {
    return new URL(url).pathname.replace(/\//g, "") !== "";
  } catch {
    return false;
  }
}

export function SettingsPage() {
  const loaded = useSettingsStore((s) => s.loaded);
  if (!loaded) return <Spinner label="Cargando configuración…" />;
  return <SettingsForm />;
}

function SettingsForm() {
  const settings = useSettingsStore();
  const themePref = useThemeStore((s) => s.preference);
  const setTheme = useThemeStore((s) => s.setPreference);

  const [deposit, setDeposit] = useState(settings.deposit_pct);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [negative, setNegative] = useState(settings.allow_negative_stock);
  const [name, setName] = useState(settings.business_name);
  const [phone, setPhone] = useState(settings.business_phone ?? "");
  const [email, setEmail] = useState(settings.business_email ?? "");
  const [address, setAddress] = useState(settings.business_address ?? "");
  const [rfc, setRfc] = useState(settings.business_rfc ?? "");
  const [footer, setFooter] = useState(settings.remission_footer ?? "");
  const [leadDays, setLeadDays] = useState(String(settings.default_lead_days));
  const [deliveredDays, setDeliveredDays] = useState(String(settings.kanban_delivered_days));
  const [inactivity, setInactivity] = useState(String(settings.inactivity_minutes));
  const [waPhone, setWaPhone] = useState<PhoneValue>(() => splitStored(settings.landing_whatsapp_e164 ?? ""));
  const [waError, setWaError] = useState<string | null>(null);
  const [hours, setHours] = useState(settings.business_hours ?? "");
  const [maps, setMaps] = useState(settings.landing_maps_url ?? "");
  const [instagram, setInstagram] = useState(settings.landing_instagram_url ?? "");
  const [facebook, setFacebook] = useState(settings.landing_facebook_url ?? "");
  const [announcement, setAnnouncement] = useState(settings.landing_announcement ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    const d = parseQuantity(deposit, { decimals: 2, allowZero: true, label: "El anticipo" });
    if (!d.ok) return setError(d.error);
    if (Number(d.value) > 100) return setError("El anticipo no puede ser mayor a 100 %.");
    if (!name.trim()) return setError("Escriba el nombre del negocio.");
    const lead = Number(leadDays);
    if (!Number.isInteger(lead) || lead < 0 || lead > 90) return setError("Días de entrega sugeridos: de 0 a 90.");
    const shown = Number(deliveredDays);
    if (!Number.isInteger(shown) || shown < 1 || shown > 90) return setError("Días de entregados en el tablero: de 1 a 90.");
    if (rfc.trim() && !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i.test(rfc.trim())) return setError("El RFC no tiene un formato válido (12 o 13 caracteres).");
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) return setError("El correo del negocio no es válido.");
    // Vacío = el sitio se publica sin botones de WhatsApp.
    const waCheck = checkPhone(waPhone.national, waPhone.country);
    if (waPhone.national && !waCheck.ok) {
      const msg = phoneMessage(waCheck) ?? "Número no válido.";
      setWaError(msg);
      return setError(`WhatsApp del sitio web: ${msg}`);
    }
    setWaError(null);
    for (const [etiqueta, valor] of [["del mapa", maps], ["de Instagram", instagram], ["de Facebook", facebook]] as const) {
      if (valor.trim() && !HTTPS.test(valor.trim())) return setError(`El enlace ${etiqueta} debe empezar con https://.`);
    }
    for (const [red, valor, ejemplo] of [
      ["Instagram", instagram, "https://www.instagram.com/imprentaescalante"],
      ["Facebook", facebook, "https://www.facebook.com/imprentaescalante"],
    ] as const) {
      if (valor.trim() && !esPerfil(valor.trim()))
        return setError(`El enlace de ${red} lleva a la página principal de ${red}, no a su perfil. Pegue el de su perfil, por ejemplo ${ejemplo}.`);
    }

    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      await settings.save({
        deposit_pct: d.value,
        timezone,
        allow_negative_stock: negative,
        business_name: name.trim(),
        business_phone: blank(phone),
        business_email: blank(email),
        business_address: blank(address),
        business_rfc: blank(rfc)?.toUpperCase() ?? null,
        remission_footer: blank(footer),
        default_lead_days: lead,
        kanban_delivered_days: shown,
        inactivity_minutes: Number(inactivity),
        landing_whatsapp_e164: waCheck.ok ? waCheck.e164 : null,
        business_hours: blank(hours),
        landing_maps_url: blank(maps),
        landing_instagram_url: blank(instagram),
        landing_facebook_url: blank(facebook),
        landing_announcement: blank(announcement),
      });
      toast.success("Configuración guardada.");
    } catch (err) {
      setError(toAppError(err).userText);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto flex max-w-3xl flex-col gap-4 md:gap-6" data-testid="settings-form">
      <div>
        <h1 className="text-2xl font-display font-normal tracking-wide text-ink-strong">Configuración</h1>
        <p className="text-sm text-ink-muted">Ajustes del negocio. Se aplican a todo el sistema al guardar.</p>
      </div>

      <Section icon={Building2} title="Datos del negocio" help="Aparecen en el encabezado y pie de la nota de remisión.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField label="Nombre comercial" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required disabled={saving}
            help="Nombre que se imprime arriba en la remisión." />
          <TextField label="Teléfono / WhatsApp" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} disabled={saving}
            help="Número de contacto para sus clientes." />
          <TextField label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} disabled={saving}
            help="Opcional. Correo de contacto en la remisión." />
          <TextField label="RFC" value={rfc} onChange={(e) => setRfc(e.target.value.toUpperCase())} maxLength={13} disabled={saving}
            help="Opcional. Solo si quiere que aparezca en la remisión." />
        </div>
        <TextField label="Dirección" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} disabled={saving}
          help="Calle, número, colonia y ciudad del taller." />
        <TextAreaField label="Leyenda al pie de la remisión" value={footer} onChange={(e) => setFooter(e.target.value)} maxLength={400} disabled={saving}
          hint={`${footer.length}/400`}
          help="Condiciones que verá el cliente. Ej.: «Trabajos no recogidos en 30 días no se garantizan»." />
      </Section>

      <Section icon={Globe} title="Página pública" help="Lo que ven sus clientes en el sitio web. Los cambios aparecen la próxima vez que el sitio se publica.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PhoneField label="WhatsApp del sitio web" value={waPhone} disabled={saving} error={waError}
            onChange={(v) => { setWaPhone(v); setWaError(null); }}
            emptyHint="Vacío: el sitio se publica sin botones de WhatsApp."
            help="Número al que le escriben desde el sitio. Elija el país en la lada y escriba el número sin la lada. También puede pegarlo completo (+52…) y se separa solo." />
          <TextField label="Horario de atención" value={hours} onChange={(e) => setHours(e.target.value)} maxLength={200} disabled={saving}
            help="Como quiere que se lea en el sitio. Ej.: «Lunes a viernes de 9 a 18, sábados de 9 a 14»." />
        </div>

        <TextField label="Enlace al mapa" inputMode="url" value={maps} onChange={(e) => setMaps(e.target.value)} maxLength={500} disabled={saving}
          help="Opcional. Pegue la dirección del taller en Google Maps. Debe empezar con https://." />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField label="Instagram" inputMode="url" value={instagram} onChange={(e) => setInstagram(e.target.value)} maxLength={300} disabled={saving}
            help="Opcional. Abra su perfil de Instagram y copie la dirección completa, por ejemplo https://www.instagram.com/imprentaescalante. La sola dirección de Instagram no se muestra en el sitio." />
          <TextField label="Facebook" inputMode="url" value={facebook} onChange={(e) => setFacebook(e.target.value)} maxLength={300} disabled={saving}
            help="Opcional. Abra la página de su negocio en Facebook y copie la dirección completa, por ejemplo https://www.facebook.com/imprentaescalante. La sola dirección de Facebook no se muestra en el sitio." />
        </div>

        <TextAreaField label="Aviso en el sitio" value={announcement} onChange={(e) => setAnnouncement(e.target.value)} maxLength={160} disabled={saving}
          hint={`${announcement.length}/160`}
          help="Opcional. Se muestra arriba de todo. Ej.: «Cerramos del 24 al 2 de enero». Déjelo vacío y la barra no aparece." />
      </Section>

      <Section icon={ClipboardList} title="Pedidos y cobros" help="Reglas que la base de datos aplica a todos los pedidos.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField label="Anticipo mínimo para producir (%)" inputMode="decimal" value={deposit} onChange={(e) => setDeposit(e.target.value)} disabled={saving}
            help="Porcentaje del total que debe pagar el cliente antes de pasar el pedido a producción. 50 % por defecto." />
          <TextField label="Días de entrega sugeridos" inputMode="numeric" value={leadDays} onChange={(e) => setLeadDays(e.target.value.replace(/\D/g, ""))} disabled={saving}
            help="Al capturar un pedido, la fecha de entrega se propone sola a esta cantidad de días. Siempre se puede cambiar." />
        </div>
      </Section>

      <Section icon={Package} title="Inventario" help="Cómo se comporta el inventario al producir.">
        <label className="flex items-start gap-2 text-sm text-ink-strong">
          <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={negative} onChange={(e) => setNegative(e.target.checked)} disabled={saving} />
          <span>
            <span className="inline-flex items-center gap-1">
              Permitir producir aunque falte material
              <InfoTip text="Activado: se puede pasar a producción con faltante, previa confirmación, y queda un aviso en Notificaciones. Desactivado: el sistema lo impide." />
            </span>
            <span className="block text-xs text-ink-muted">Recomendado mientras el inventario físico no esté capturado.</span>
          </span>
        </label>
      </Section>

      <Section icon={LayoutDashboard} title="Tablero y fechas" help="Cómo se calculan las fechas y qué se ve en el tablero.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SelectField label="Zona horaria" value={timezone} onChange={(e) => setTimezone(e.target.value)} disabled={saving}
            help="Define qué es «hoy», «mañana» y «vencido» en el tablero, el calendario y la app de entregas.">
            {(TIMEZONES.includes(settings.timezone) ? TIMEZONES : [settings.timezone, ...TIMEZONES]).map((tz) => (
              <option key={tz} value={tz}>
                {TZ_LABEL[tz] ?? tz}
              </option>
            ))}
          </SelectField>
          <TextField label="Días que se ven los entregados" inputMode="numeric" value={deliveredDays}
            onChange={(e) => setDeliveredDays(e.target.value.replace(/\D/g, ""))} disabled={saving}
            help="Cuántos días permanece un pedido en la columna «Entregado» del tablero. Los que tienen adeudo siempre se ven." />
        </div>
      </Section>

      <Section icon={ShieldCheck} title="Seguridad" help="Protección del panel en computadoras compartidas.">
        <SelectField label="Cerrar sesión por inactividad" value={inactivity} onChange={(e) => setInactivity(e.target.value)} disabled={saving}
          help="Si nadie usa el panel durante este tiempo, la sesión se cierra sola y hay que volver a entrar.">
          <option value="15">A los 15 minutos</option>
          <option value="30">A los 30 minutos (recomendado)</option>
          <option value="60">A la hora</option>
          <option value="120">A las 2 horas</option>
        </SelectField>
      </Section>

      <Section icon={Palette} title="Apariencia" help="Solo afecta a esta computadora. Se guarda al instante.">
        <div role="radiogroup" aria-label="Tema" className="flex flex-wrap gap-2">
          {(
            [
              ["system", "Igual que el sistema"],
              ["light", "Claro"],
              ["dark", "Oscuro"],
            ] as [ThemePreference, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={themePref === value}
              onClick={() => setTheme(value)}
              className={`min-h-10 rounded-full border-2 px-4 text-sm font-semibold ${
                themePref === value ? "border-primary bg-primary text-primary-ink" : "border-line bg-surface-0 text-ink-strong"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Section>

      {error && (
        <p role="alert" className="text-sm font-semibold text-blocked-ink">
          [!] {error}
        </p>
      )}
      <div className="flex md:justify-end">
        <Button type="submit" loading={saving} className="w-full md:w-auto">
          Guardar configuración
        </Button>
      </div>
    </form>
  );
}
