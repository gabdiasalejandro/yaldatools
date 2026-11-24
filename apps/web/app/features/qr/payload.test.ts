import { describe, expect, it } from "vitest";
import { buildPayload } from "./payload";

describe("buildPayload: url", () => {
  it("adds https:// when the scheme is missing", () => {
    expect(buildPayload({ type: "url", url: " yaldapika.com " })).toBe("https://yaldapika.com");
    expect(buildPayload({ type: "url", url: "http://a.com/x?y=1" })).toBe("http://a.com/x?y=1");
  });

  it("returns null when empty", () => {
    expect(buildPayload({ type: "url", url: "  " })).toBeNull();
  });
});

describe("buildPayload: text", () => {
  it("keeps the text as typed", () => {
    expect(buildPayload({ type: "text", text: "Hola\nmundo " })).toBe("Hola\nmundo ");
    expect(buildPayload({ type: "text", text: " " })).toBeNull();
  });
});

describe("buildPayload: wifi", () => {
  it("builds a WPA network and escapes special characters", () => {
    expect(
      buildPayload({ type: "wifi", ssid: 'Casa;Yalda', password: 'a:b,c"d\\', security: "WPA", hidden: false }),
    ).toBe(String.raw`WIFI:T:WPA;S:Casa\;Yalda;P:a\:b\,c\"d\\;;`);
  });

  it("marks hidden networks", () => {
    expect(buildPayload({ type: "wifi", ssid: "x", password: "p", security: "WEP", hidden: true })).toBe(
      "WIFI:T:WEP;S:x;P:p;H:true;;",
    );
  });

  it("leaves out the password for open networks", () => {
    expect(buildPayload({ type: "wifi", ssid: "Libre", password: "ignored", security: "nopass", hidden: false })).toBe(
      "WIFI:T:nopass;S:Libre;;",
    );
  });

  it("requires the network name", () => {
    expect(buildPayload({ type: "wifi", ssid: "", password: "p", security: "WPA", hidden: false })).toBeNull();
  });
});

describe("buildPayload: contact", () => {
  const empty = { type: "contact", firstName: "", lastName: "", phone: "", email: "", org: "", website: "" } as const;

  it("builds a vCard 3.0 with only the filled fields", () => {
    expect(buildPayload({ ...empty, firstName: "Yalda", lastName: "Pika, Sr.", phone: "+34 600 000 000" })).toBe(
      [
        "BEGIN:VCARD",
        "VERSION:3.0",
        "N:Pika\\, Sr.;Yalda;;;",
        "FN:Yalda Pika\\, Sr.",
        "TEL;TYPE=CELL:+34 600 000 000",
        "END:VCARD",
      ].join("\r\n"),
    );
  });

  it("escapes semicolons, backslashes and newlines in vCard values", () => {
    const vcard = buildPayload({ ...empty, firstName: "Ana", org: "A;B\\C\nD" });
    expect(vcard).toContain(String.raw`ORG:A\;B\\C\nD`);
  });

  it("returns null when nothing identifies the contact", () => {
    expect(buildPayload({ ...empty, org: "ACME" })).toBeNull();
  });
});

describe("buildPayload: whatsapp", () => {
  it("keeps only the digits of the number and encodes the message", () => {
    expect(buildPayload({ type: "whatsapp", phone: "+52 (55) 1234-5678", message: "¡Hola & adiós!" })).toBe(
      "https://wa.me/525512345678?text=%C2%A1Hola%20%26%20adi%C3%B3s!",
    );
    expect(buildPayload({ type: "whatsapp", phone: "34600000000", message: "" })).toBe("https://wa.me/34600000000");
  });

  it("requires a number", () => {
    expect(buildPayload({ type: "whatsapp", phone: "abc", message: "hi" })).toBeNull();
  });
});

describe("buildPayload: email", () => {
  it("builds a mailto link with optional subject and body", () => {
    expect(buildPayload({ type: "email", to: "hola@ejemplo.com", subject: "Hola mundo", body: "a&b" })).toBe(
      "mailto:hola@ejemplo.com?subject=Hola%20mundo&body=a%26b",
    );
    expect(buildPayload({ type: "email", to: " hola@ejemplo.com ", subject: "", body: "" })).toBe(
      "mailto:hola@ejemplo.com",
    );
  });

  it("requires the recipient", () => {
    expect(buildPayload({ type: "email", to: "", subject: "x", body: "" })).toBeNull();
  });
});
