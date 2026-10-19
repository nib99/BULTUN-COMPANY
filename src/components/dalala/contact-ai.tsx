import { useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Bot, ExternalLink, MessageCircle, Send, Sparkles, X } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { askBultumAi } from "@/lib/bultum-ai";
import { companyWhatsAppUrl } from "@/lib/company";

const TELEGRAM_URL = "https://t.me/BultumMarketplaceBot/bultum";

type ListingContext = {
  id?: string;
  title?: string;
  category?: string;
  make?: string;
  model?: string;
  year?: number | null;
  condition?: string;
  city?: string;
  price?: string;
  mileageKm?: number | null;
  hours?: number | null;
  summary?: string;
  imageUrl?: string;
};

const ui: Record<Locale, {
  ai: string;
  subtitle: string;
  current: string;
  placeholder: string;
  ask: string;
  close: string;
  whatsapp: string;
  telegram: string;
  unavailable: string;
  rate: string;
  examplesGeneral: string[];
  examplesListing: string[];
}> = {
  en: {
    ai: "BULTUM AI", subtitle: "Cars, machinery & marketplace help", current: "Current listing",
    placeholder: "Ask about BULTUM, a car or machine…", ask: "Ask", close: "Close",
    whatsapp: "WhatsApp 0912615662", telegram: "Telegram Bot",
    unavailable: "BULTUM AI is temporarily unavailable. Please use WhatsApp or Telegram.",
    rate: "Please wait a moment before asking another question.",
    examplesGeneral: ["How do I buy a machine safely?", "How do I submit a listing?", "How can I contact BULTUM COMPANY?"],
    examplesListing: ["What can you tell me about this machine?", "What should I inspect before buying it?", "What information is missing from this listing?"],
  },
  om: {
    ai: "BULTUM AI", subtitle: "Konkolaataa, maashinii fi gabaa", current: "Tarreeffama amma ilaalamaa jiru",
    placeholder: "Waa'ee BULTUM, konkolaataa ykn maashinii gaafadhu…", ask: "Gaafadhu", close: "Cufi",
    whatsapp: "WhatsApp 0912615662", telegram: "Telegram Bot",
    unavailable: "BULTUM AI yeroo ammaa hin hojjetu. Maaloo WhatsApp ykn Telegram fayyadami.",
    rate: "Maaloo yeroo muraasa eegi; sana booda gaaffii biraa gaafadhu.",
    examplesGeneral: ["Maashinii akkamitti nageenyaan bitachuu danda'a?", "Akkamitti tarreeffama gurgurtaa galchuu danda'a?", "Akkamitti BULTUM COMPANY qunnamuu danda'a?"],
    examplesListing: ["Waa'ee maashinii kana maal naaf himta?", "Bittaa dura maal qorachuu qaba?", "Tarreeffama kana keessatti odeeffannoon maali hir'ata?"],
  },
  am: {
    ai: "BULTUM AI", subtitle: "መኪና፣ ማሽነሪ እና የገበያ እገዛ", current: "የአሁኑ ማስታወቂያ",
    placeholder: "ስለ BULTUM፣ መኪና ወይም ማሽን ይጠይቁ…", ask: "ጠይቅ", close: "ዝጋ",
    whatsapp: "WhatsApp 0912615662", telegram: "Telegram Bot",
    unavailable: "BULTUM AI በአሁኑ ጊዜ አይገኝም። WhatsApp ወይም Telegram ይጠቀሙ።",
    rate: "እባክዎ ጥቂት ጊዜ ይጠብቁና እንደገና ይጠይቁ።",
    examplesGeneral: ["ማሽን በደህና እንዴት መግዛት እችላለሁ?", "ማስታወቂያ እንዴት እጨምራለሁ?", "BULTUM COMPANYን እንዴት ማግኘት እችላለሁ?"],
    examplesListing: ["ስለዚህ ማሽን ምን ልታስረዳኝ ትችላለህ?", "ከመግዛቴ በፊት ምን ልፈትሽ?", "በዚህ ማስታወቂያ ውስጥ የጎደለው መረጃ ምንድነው?"],
  },
  so: {
    ai: "BULTUM AI", subtitle: "Baabuur, mashiin & caawinta suuqa", current: "Xayeysiiska hadda",
    placeholder: "Weydii BULTUM, baabuur ama mashiin…", ask: "Weydii", close: "Xir",
    whatsapp: "WhatsApp 0912615662", telegram: "Telegram Bot",
    unavailable: "BULTUM AI hadda lama heli karo. Fadlan isticmaal WhatsApp ama Telegram.",
    rate: "Fadlan wax yar sug ka hor intaadan su'aal kale weydiin.",
    examplesGeneral: ["Sideen mashiin si ammaan ah u iibsan karaa?", "Sideen xayeysiis u gudbin karaa?", "Sideen ula xiriiri karaa BULTUM COMPANY?"],
    examplesListing: ["Maxaad iga sheegi kartaa mashiinkan?", "Maxaan hubiyaa ka hor iibsiga?", "Waa maxay xogta ka maqan xayeysiiskan?"],
  },
};

export function DalalaContactHub({ listing }: { listing?: ListingContext }) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const segment = path.split("/")[1];
  const locale: Locale = segment === "om" || segment === "am" || segment === "so" ? segment : "en";
  const [open, setOpen] = useState(false);
  const copy = ui[locale];
  return (
    <>
      <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2 sm:bottom-5">
        {open ? (
          <div className="w-[min(92vw,390px)] overflow-hidden rounded-[1.5rem] border border-line-soft bg-ivory shadow-2xl">
            <AiPanel locale={locale} listing={listing} onClose={() => setOpen(false)} />
          </div>
        ) : null}
        <div className="flex items-center gap-2 rounded-full border border-line-soft bg-ivory/95 p-2 shadow-xl backdrop-blur">
          <a href={companyWhatsAppUrl("Hello BULTUM COMPANY, I need help with the marketplace.")} target="_blank" rel="noopener noreferrer" aria-label={copy.whatsapp} className="grid size-11 place-items-center rounded-full bg-[#25D366] text-white shadow-sm" title={copy.whatsapp}>
            <MessageCircle className="size-5" />
          </a>
          <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label={copy.telegram} className="grid size-11 place-items-center rounded-full bg-[#229ED9] text-white shadow-sm" title={copy.telegram}>
            <Send className="size-5" />
          </a>
          <button type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? copy.close : copy.ai} className="grid size-11 place-items-center rounded-full bg-ink text-gold shadow-sm" title={copy.ai}>
            {open ? <X className="size-5" /> : <Sparkles className="size-5" />}
          </button>
        </div>
      </div>
    </>
  );
}

export function DalalaAiButton({ locale, listing }: { locale: Locale; listing?: ListingContext }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-gold shadow-sm hover:brightness-110">
        <Bot className="size-4" />
        {ui[locale].ai}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/30 p-3 sm:place-items-center" role="dialog" aria-modal="true" aria-label={ui[locale].ai}>
          <div className="w-full max-w-md overflow-hidden rounded-[1.5rem] border border-line-soft bg-ivory shadow-2xl">
            <AiPanel locale={locale} listing={listing} onClose={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}

function AiPanel({ locale, listing, onClose }: { locale: Locale; listing?: ListingContext; onClose: () => void }) {
  const copy = ui[locale];
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const examples = listing ? copy.examplesListing : copy.examplesGeneral;

  async function submit(text = question) {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    setError("");
    setQuestion(value);
    try {
      const result = await askBultumAi({ data: { locale, question: value, listing: listing ?? null } });
      setAnswer(result.answer);
    } catch (err) {
      setError(err instanceof Error && err.message === "rate" ? copy.rate : copy.unavailable);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <header className="flex items-center gap-3 bg-ink px-4 py-3 text-ivory">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gold text-ink"><Sparkles className="size-5" /></div>
        <div className="min-w-0 flex-1"><p className="font-black">{copy.ai}</p><p className="truncate text-xs text-ivory/65">{copy.subtitle}</p></div>
        <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full bg-white/10" aria-label={copy.close}><X className="size-4" /></button>
      </header>

      <div className="max-h-[65vh] space-y-4 overflow-y-auto p-4">
        {listing ? <div className="rounded-2xl border border-line-soft bg-card p-3 text-sm"><p className="text-xs font-black uppercase tracking-wider text-gold-2">{copy.current}</p><p className="mt-1 font-bold">{listing.title}</p><p className="mt-1 text-muted">{listing.make} {listing.model}{listing.year ? ` · ${listing.year}` : ""}</p></div> : null}

        <div className="space-y-2">
          {examples.map((example) => <button key={example} type="button" disabled={busy} onClick={() => void submit(example)} className="block w-full rounded-xl border border-line-soft bg-card px-3 py-2 text-left text-sm font-semibold hover:border-gold disabled:opacity-60">{example}</button>)}
        </div>

        {answer ? <div className="whitespace-pre-wrap rounded-2xl bg-[#eef7ff] p-4 text-sm leading-6 text-ink">{answer}</div> : null}
        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

        <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="flex gap-2">
          <input value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={1200} placeholder={copy.placeholder} className="min-w-0 flex-1 rounded-xl border border-line-soft bg-card px-3 py-3 text-sm outline-none focus:border-gold" aria-label={copy.ai} />
          <button type="submit" disabled={busy || question.trim().length < 2} className="grid size-12 shrink-0 place-items-center rounded-xl bg-emerald text-white disabled:opacity-50" aria-label={copy.ask}>
            {busy ? <span className="text-xs font-black">…</span> : <Send className="size-4" />}
          </button>
        </form>

        <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted">
          <a href={companyWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-line-soft px-3 py-2"><MessageCircle className="size-3.5" /> {copy.whatsapp}</a>
          <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-line-soft px-3 py-2"><ExternalLink className="size-3.5" /> {copy.telegram}</a>
        </div>
      </div>
    </section>
  );
}
