export const COMPANY_WHATSAPP_NUMBER = "251912615662";
export const COMPANY_PHONE = "+251 912 615 662";

export function companyWhatsAppUrl(message?: string) {
  const base = `https://wa.me/${COMPANY_WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
