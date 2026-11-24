// Turns the form content of each QR type into the text that gets encoded.

export type WifiSecurity = "WPA" | "WEP" | "nopass";

export type QrContent =
  | { type: "url"; url: string }
  | { type: "text"; text: string }
  | { type: "wifi"; ssid: string; password: string; security: WifiSecurity; hidden: boolean }
  | {
      type: "contact";
      firstName: string;
      lastName: string;
      phone: string;
      email: string;
      org: string;
      website: string;
    }
  | { type: "whatsapp"; phone: string; message: string }
  | { type: "email"; to: string; subject: string; body: string };

export type QrType = QrContent["type"];

// Special characters of the WIFI: format, escaped with a backslash.
function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

// vCard 3.0 text values (RFC 2426): backslash, comma, semicolon and newlines.
function escapeVcard(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\r?\n/g, "\\n");
}

function query(params: Record<string, string>): string {
  const pairs = Object.entries(params)
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`);
  return pairs.length > 0 ? `?${pairs.join("&")}` : "";
}

/** Text to encode, or null while a required field is still empty. */
export function buildPayload(content: QrContent): string | null {
  switch (content.type) {
    case "url": {
      const url = content.url.trim();
      if (!url) return null;
      return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
    }
    case "text":
      return content.text.trim() ? content.text : null;
    case "wifi": {
      if (!content.ssid) return null;
      const parts = [`T:${content.security}`, `S:${escapeWifi(content.ssid)}`];
      if (content.security !== "nopass") parts.push(`P:${escapeWifi(content.password)}`);
      if (content.hidden) parts.push("H:true");
      return `WIFI:${parts.join(";")};;`;
    }
    case "contact": {
      const first = content.firstName.trim();
      const last = content.lastName.trim();
      const fields = { phone: content.phone.trim(), email: content.email.trim() };
      if (!first && !last && !fields.phone && !fields.email) return null;
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${escapeVcard(last)};${escapeVcard(first)};;;`,
        `FN:${escapeVcard([first, last].filter(Boolean).join(" "))}`,
      ];
      if (content.org.trim()) lines.push(`ORG:${escapeVcard(content.org.trim())}`);
      if (fields.phone) lines.push(`TEL;TYPE=CELL:${escapeVcard(fields.phone)}`);
      if (fields.email) lines.push(`EMAIL:${escapeVcard(fields.email)}`);
      if (content.website.trim()) lines.push(`URL:${escapeVcard(content.website.trim())}`);
      lines.push("END:VCARD");
      return lines.join("\r\n");
    }
    case "whatsapp": {
      const digits = content.phone.replace(/\D/g, "");
      if (!digits) return null;
      return `https://wa.me/${digits}${query({ text: content.message })}`;
    }
    case "email": {
      const to = content.to.trim();
      if (!to) return null;
      return `mailto:${to}${query({ subject: content.subject, body: content.body })}`;
    }
  }
}
