import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Locale } from "@/lib/i18n";

const localeSchema = z.enum(["en", "om", "am", "so"]);

const listingSchema = z.object({
  id: z.string().max(120).optional(),
  title: z.string().max(120).optional(),
  category: z.string().max(40).optional(),
  make: z.string().max(60).optional(),
  model: z.string().max(60).optional(),
  year: z.number().int().nullable().optional(),
  condition: z.string().max(30).optional(),
  city: z.string().max(80).optional(),
  price: z.string().max(60).optional(),
  mileageKm: z.number().int().nullable().optional(),
  hours: z.number().int().nullable().optional(),
  summary: z.string().max(800).optional(),
  imageUrl: z.string().url().max(3000).optional(),
});

const askSchema = z.object({
  locale: localeSchema,
  question: z.string().trim().min(2).max(1200),
  listing: listingSchema.nullable().optional(),
});

type AskInput = z.infer<typeof askSchema>;

type ResponsePayload = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

const recentQuestions = new Map<string, number[]>();

function allowQuestion(question: string) {
  const now = Date.now();
  const key = question.toLowerCase().replace(/\s+/g, " ").slice(0, 500);
  const recent = (recentQuestions.get(key) ?? []).filter((stamp) => now - stamp < 60_000);
  if (recent.length >= 5) return false;
  recent.push(now);
  recentQuestions.set(key, recent);
  return true;
}

function localeName(locale: Locale) {
  return {
    en: "English",
    om: "Afaan Oromoo",
    am: "Amharic (አማርኛ)",
    so: "Somali (Af-Soomaali)",
  }[locale];
}

function listingContext(listing: AskInput["listing"]) {
  if (!listing) return "No specific listing is selected.";
  return JSON.stringify({
    listingId: listing.id,
    title: listing.title,
    category: listing.category,
    make: listing.make,
    model: listing.model,
    year: listing.year,
    condition: listing.condition,
    city: listing.city,
    price: listing.price,
    mileageKm: listing.mileageKm,
    hours: listing.hours,
    summary: listing.summary,
  });
}

const fallback: Record<Locale, {
  prefix: string;
  about: string;
  contact: string;
  sell: string;
  buy: string;
  listing: (title: string) => string;
}> = {
  en: {
    prefix: "BULTUM AI: ",
    about: "BULTUM COMPANY is an Ethiopian marketplace for cars, trucks, heavy machinery and agricultural equipment. I can help with listings, buying, selling, seller contact, moderation and marketplace features.",
    contact: "You can contact BULTUM COMPANY on WhatsApp at 0912615662 or use the BULTUM Marketplace Bot on Telegram: https://t.me/BultumMarketplaceBot/bultum.",
    sell: "Sign in, open Sell, enter accurate vehicle or machinery details, add photos/video, and choose Submit for review. A listing becomes public only after authorized BULTUM moderation approves it.",
    buy: "Before buying, check the VIN/chassis or serial number, ownership documents, service history, engine and transmission, hydraulics for machinery, tires/undercarriage, accident or repair history, and seller identity. Arrange an independent inspection before payment.",
    listing: (title) => `${title} is a BULTUM marketplace listing. Use the displayed listing data for facts supplied by the seller. An image alone cannot prove exact year, operating hours, mechanical condition, ownership, mileage or authenticity. Inspect the machine or vehicle and documents before payment.`,
  },
  om: {
    prefix: "BULTUM AI: ",
    about: "BULTUM COMPANY gabaa interneetii Itoophiyaa keessatti konkolaataa, baabura fe'umsaa, meeshaalee hojii ulfaataa fi meeshaalee qonnaa beeksisuudha. Waa'ee tarreeffama, bittaa, gurgurtaa, qunnamtii gurguraa fi tajaajila gabaa irratti si gargaaruu nan danda'a.",
    contact: "BULTUM COMPANY WhatsApp irratti 0912615662 ykn Telegram irratti BULTUM Marketplace Bot fayyadamuun qunnami: https://t.me/BultumMarketplaceBot/bultum.",
    sell: "Seeni, Sell bani, odeeffannoo konkolaataa ykn maashinii sirrii guuti, suuraa/video dabali, achiis Submit for review filadhu. Tarreeffamni erga bulchaa BULTUM aangoo qabuun mirkanaa'e booda qofa uummataaf mul'ata.",
    buy: "Bittaa dura lakkoofsa VIN/chassis ykn serial, ragaa abbummaa, seenaa tajaajilaa, haala engine fi transmission, hydraulic maashinii, taayiraa/undercarriage, seenaa balaa ykn suphaa fi eenyummaa gurguraa ilaali. Kaffaltii dura ogeessa ofiin qorachiisi.",
    listing: (title) => `${title} tarreeffama gabaa BULTUM ti. Dhugaa tarreeffamaa irratti odeeffannoo gurguraan kenne qofa irratti hundaa'i. Suuraan qofti waggaa, sa'aatii hojii, haala maashinii, abbummaa, mileage ykn dhugummaa isaa sirriitti mirkaneessuu hin danda'u. Kaffaltii dura maashinii/konkolaataa fi ragaa isaa qorachiisi.`,
  },
  am: {
    prefix: "BULTUM AI፦ ",
    about: "BULTUM COMPANY በኢትዮጵያ ውስጥ መኪናዎችን፣ ትራኮችን፣ ከባድ ማሽነሪዎችን እና የግብርና መሳሪያዎችን የሚያስተዋውቅ የገበያ መድረክ ነው። ስለ ማስታወቂያዎች፣ ግዢ፣ ሽያጭ፣ የሻጭ ግንኙነት፣ ማረጋገጫ እና የመድረኩ አጠቃቀም መርዳት እችላለሁ።",
    contact: "BULTUM COMPANYን WhatsApp በ0912615662 ወይም Telegram ላይ BULTUM Marketplace Botን በመጠቀም ማግኘት ይችላሉ፦ https://t.me/BultumMarketplaceBot/bultum።",
    sell: "ይግቡ፣ Sell ይክፈቱ፣ ትክክለኛ የመኪና ወይም የማሽን መረጃ ያስገቡ፣ ፎቶ/ቪዲዮ ያክሉ እና Submit for review ይምረጡ። ማስታወቂያው በBULTUM ስልጣን ባለው አስተዳደር ከተፈቀደ በኋላ ብቻ ለሁሉም ይታያል።",
    buy: "ከመግዛትዎ በፊት VIN/chassis ወይም serial ቁጥር፣ የባለቤትነት ሰነዶች፣ የጥገና ታሪክ፣ engine እና transmission፣ የማሽን hydraulic ሁኔታ፣ ጎማ/undercarriage፣ የአደጋ ወይም ጥገና ታሪክ እና የሻጩን ማንነት ይፈትሹ። ከመክፈልዎ በፊት በባለሙያ ያስመርምሩ።",
    listing: (title) => `${title} በBULTUM የተዘረዘረ ማስታወቂያ ነው። ለተረጋገጠ የማስታወቂያ መረጃ ሻጩ ያቀረበውን ውሂብ ይጠቀሙ። ፎቶ ብቻ ትክክለኛ የምርት ዓመት፣ የስራ ሰዓት፣ የማሽኑ ሁኔታ፣ ባለቤትነት፣ mileage ወይም እውነተኛነት ማረጋገጥ አይችልም። ከመክፈልዎ በፊት ማሽኑን/መኪናውን እና ሰነዶቹን ያረጋግጡ።`,
  },
  so: {
    prefix: "BULTUM AI: ",
    about: "BULTUM COMPANY waa suuq online ah oo Itoobiya ka shaqeeya, kuna saabsan baabuur, gaadiid xamuul, mashiinno culus iyo qalabka beeraha. Waxaan kaa caawin karaa xayeysiisyada, iibsiga, iibinta, xiriirka iibiyaha iyo isticmaalka suuqa.",
    contact: "Waxaad BULTUM COMPANY kala xiriiri kartaa WhatsApp 0912615662 ama Telegram BULTUM Marketplace Bot: https://t.me/BultumMarketplaceBot/bultum.",
    sell: "Soo gal, fur Sell, geli xogta saxda ah ee baabuurka ama mashiinka, ku dar sawirro/video, kadibna dooro Submit for review. Xayeysiisku dadweynaha wuxuu u muuqdaa marka maamulaha BULTUM ee idman uu ansixiyo.",
    buy: "Kahor intaadan iibsan, hubi VIN/chassis ama serial number, dukumentiyada lahaanshaha, taariikhda adeegga, engine iyo transmission, hydraulic-ka mashiinka, taayirrada/undercarriage, taariikhda shilalka ama dayactirka iyo aqoonsiga iibiyaha. Samee baaritaan madax-bannaan ka hor lacag bixinta.",
    listing: (title) => `${title} waa xayeysiis ku jira suuqa BULTUM. Xogta la xaqiijin karo ee xayeysiiska waxay ku salaysan tahay xogta iibiyuhu bixiyay. Sawir keliya ma xaqiijin karo sanadka saxda ah, saacadaha shaqada, xaaladda mashiinka, lahaanshaha, mileage ama runnimada. Hubi mashiinka/baabuurka iyo dukumentiyada ka hor lacag bixinta.`,
  },
};

function fallbackAnswer(question: string, locale: Locale, listing: AskInput["listing"]) {
  const q = question.toLowerCase();
  const copy = fallback[locale];
  const prefix = copy.prefix;

  if (listing && /(what|which|maal|maalid|ምን|waa maxay|machine|excavator|car|vehicle|ማሽን|ኤክስካቫተር)/i.test(q)) {
    return prefix + copy.listing(listing.title ?? "This listing");
  }
  if (/(whatsapp|0912|contact|ግንኙነት|qunnamtii|qunnamtii|xiriir)/i.test(q)) return prefix + copy.contact;
  if (/(sell|list|post|publish|gurgur|galmeess|ሽጥ|iibi)/i.test(q)) return prefix + copy.sell;
  if (/(buy|buyer|purchase|check|inspect|bittaa|bitachuu|ግዛ|iib)/i.test(q)) return prefix + copy.buy;
  return prefix + copy.about;
}

function extractOutput(payload: ResponsePayload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  const text = payload.output
    ?.flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text" && typeof part.text === "string")
    .map((part) => part.text!.trim())
    .filter(Boolean)
    .join("\n");
  return text || "I could not generate an answer right now.";
}

export const askBultumAi = createServerFn({ method: "POST" })
  .validator((input: unknown) => askSchema.parse(input))
  .handler(async ({ data }) => {
    if (!allowQuestion(data.question)) throw new Error("rate");

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return { answer: fallbackAnswer(data.question, data.locale, data.listing), poweredByAi: false };

    const language = localeName(data.locale);
    const instructions = `You are BULTUM AI, the official multilingual marketplace assistant for BULTUM COMPANY in Ethiopia.

LANGUAGE POLICY:
- Answer in ${language}.
- For Afaan Oromoo, use natural modern Afaan Oromoo and Oromo spelling; do not switch to Amharic or English unless a proper name, vehicle specification, URL, or technical term needs to remain unchanged.
- For Amharic, answer naturally in አማርኛ using clear Ethiopian terminology.
- For Somali, answer naturally in Af-Soomaali.
- For English, use clear professional English.
- Do not translate brand names, seller names, vehicle model names, URLs, phone numbers, VINs, serial numbers, or technical codes unless useful.
- If the user mixes languages, understand the question and answer primarily in the requested platform locale (${language}).

BULTUM COMPANY FACTS:
- BULTUM is an Ethiopian marketplace for cars, pickups, trucks, heavy machinery and agricultural equipment.
- Users can browse public listings, save listings, contact sellers, share listings, and submit their own listings for moderation.
- Draft and pending listings are not public. A listing becomes public only after an authorized BULTUM moderator/admin approves it.
- BULTUM must never claim that a vehicle or machine is genuine, mechanically sound, legally owned, inspected, or verified unless that fact is explicitly present in the supplied listing data or an authorized BULTUM status.
- Never invent price, year, mileage, operating hours, specifications, seller identity, ownership, inspection results or verification.
- When advising a buyer, recommend checking identity/ownership documents, VIN/chassis/serial number, service history, mechanical condition and an independent inspection before payment.
- BULTUM support WhatsApp: 0912615662.
- BULTUM Telegram bot: https://t.me/BultumMarketplaceBot/bultum.

LISTING RULES:
- If a specific listing is supplied, use its supplied data first.
- Clearly distinguish seller-provided facts from general knowledge and visual observations.
- An image cannot by itself prove exact year, model variant, mileage, operating hours, ownership, authenticity or mechanical condition.
- If the supplied listing lacks an important fact, say that the information is not available instead of guessing.
- If the user asks for a recommendation or valuation, explain the factors that affect the answer and avoid inventing a market price.
- If the user asks how to contact a seller, direct them to the contact options actually shown on the listing. Do not expose private data that is not supplied as public listing information.

Current listing context:
${listingContext(data.listing)}`;

    const userContent: Array<Record<string, unknown>> = [
      { type: "input_text", text: data.question },
    ];
    if (data.listing?.imageUrl?.startsWith("https://")) {
      userContent.push({ type: "input_image", image_url: data.listing.imageUrl, detail: "low" });
    }

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.BULTUM_AI_MODEL?.trim() || "gpt-4.1-mini",
          instructions,
          input: [{ role: "user", content: userContent }],
          max_output_tokens: 700,
          store: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error("BULTUM AI provider error", response.status, errorText.slice(0, 500));
        return { answer: fallbackAnswer(data.question, data.locale, data.listing), poweredByAi: false };
      }

      const payload = (await response.json()) as ResponsePayload;
      return { answer: extractOutput(payload), poweredByAi: true };
    } catch (error) {
      console.error("BULTUM AI request failed", error);
      return { answer: fallbackAnswer(data.question, data.locale, data.listing), poweredByAi: false };
    }
  });
