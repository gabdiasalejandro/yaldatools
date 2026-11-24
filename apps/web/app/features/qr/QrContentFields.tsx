import { useId } from "react";
import { useMessages, type Messages } from "~/i18n/messages";
import type { ContentOf, QrContents } from "./contents";
import type { QrContent, QrType, WifiSecurity } from "./payload";

type FieldLabel = keyof Messages["qr"]["fields"];

type TextField = {
  key: string;
  label: FieldLabel;
  input: "text" | "url" | "email" | "tel" | "password" | "textarea";
  autoComplete?: string;
};

// Plain text inputs of each type; WiFi security and hidden flag are rendered apart.
const FIELDS: Record<QrType, TextField[]> = {
  url: [{ key: "url", label: "url", input: "url", autoComplete: "url" }],
  text: [{ key: "text", label: "text", input: "textarea" }],
  wifi: [
    { key: "ssid", label: "ssid", input: "text" },
    { key: "password", label: "password", input: "password", autoComplete: "off" },
  ],
  contact: [
    { key: "firstName", label: "firstName", input: "text", autoComplete: "given-name" },
    { key: "lastName", label: "lastName", input: "text", autoComplete: "family-name" },
    { key: "phone", label: "phone", input: "tel", autoComplete: "tel" },
    { key: "email", label: "email", input: "email", autoComplete: "email" },
    { key: "org", label: "org", input: "text", autoComplete: "organization" },
    { key: "website", label: "website", input: "url", autoComplete: "url" },
  ],
  whatsapp: [
    { key: "phone", label: "whatsappPhone", input: "tel", autoComplete: "tel" },
    { key: "message", label: "message", input: "textarea" },
  ],
  email: [
    { key: "to", label: "to", input: "email", autoComplete: "email" },
    { key: "subject", label: "subject", input: "text" },
    { key: "body", label: "body", input: "textarea" },
  ],
};

const SECURITIES: readonly WifiSecurity[] = ["WPA", "WEP", "nopass"];

type QrContentFieldsProps<T extends QrType> = {
  type: T;
  content: QrContents[T];
  onChange: (patch: Partial<ContentOf<T>>) => void;
};

export function QrContentFields<T extends QrType>({ type, content, onChange }: QrContentFieldsProps<T>) {
  const t = useMessages();
  const baseId = useId();
  const values = content as unknown as Record<string, string | boolean>;
  const union: QrContent = content;
  const wifi = union.type === "wifi" ? union : null;

  return (
    <fieldset className="fieldset" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <legend>
        {t.qr.content} · {t.qr.types[type]}
      </legend>
      {FIELDS[type].map((field) => {
        const id = `${baseId}-${field.key}`;
        const hidden = wifi?.security === "nopass" && field.key === "password";
        if (hidden) return null;
        const common = {
          id,
          className: "sunken field",
          value: String(values[field.key] ?? ""),
          autoComplete: field.autoComplete,
          onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            onChange({ [field.key]: event.target.value } as Partial<ContentOf<T>>),
        };
        return (
          <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label htmlFor={id}>{t.qr.fields[field.label]}</label>
            {field.input === "textarea" ? <textarea rows={3} {...common} /> : <input type={field.input} {...common} />}
          </div>
        );
      })}
      {wifi && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <label htmlFor={`${baseId}-security`}>{t.qr.fields.security}</label>
          <select
            id={`${baseId}-security`}
            className="sunken field"
            value={wifi.security}
            onChange={(event) => onChange({ security: event.target.value as WifiSecurity } as Partial<ContentOf<T>>)}
          >
            {SECURITIES.map((security) => (
              <option key={security} value={security}>
                {t.qr.security[security]}
              </option>
            ))}
          </select>
          <label style={{ display: "flex", gap: 6, alignItems: "center", minHeight: 44 }}>
            <input
              type="checkbox"
              checked={wifi.hidden}
              onChange={(event) => onChange({ hidden: event.target.checked } as Partial<ContentOf<T>>)}
            />
            {t.qr.fields.hidden}
          </label>
        </div>
      )}
    </fieldset>
  );
}
