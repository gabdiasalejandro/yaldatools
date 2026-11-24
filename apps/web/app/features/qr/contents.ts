import type { QrContent, QrType } from "./payload";

export type ContentOf<T extends QrType> = Extract<QrContent, { type: T }>;
export type QrContents = { [T in QrType]: ContentOf<T> };

export const QR_TYPES: readonly QrType[] = ["url", "text", "wifi", "contact", "whatsapp", "email"];

/** Every type keeps its own values, so switching tabs does not lose what was typed. */
export const EMPTY_CONTENTS: QrContents = {
  url: { type: "url", url: "" },
  text: { type: "text", text: "" },
  wifi: { type: "wifi", ssid: "", password: "", security: "WPA", hidden: false },
  contact: { type: "contact", firstName: "", lastName: "", phone: "", email: "", org: "", website: "" },
  whatsapp: { type: "whatsapp", phone: "", message: "" },
  email: { type: "email", to: "", subject: "", body: "" },
};
