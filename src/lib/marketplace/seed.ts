import type { Sql } from "@/lib/db";

type Copy = { en: [string, string]; om: [string, string]; am: [string, string]; so: [string, string] };

type DemoListing = {
  id: string;
  seller: string;
  category: "cars" | "trucks" | "machinery" | "agriculture";
  condition: "used" | "new";
  priceBirr: number;
  city: string;
  year: number;
  make: string;
  model: string;
  mileageKm: number | null;
  hours: number | null;
  cover: string;
  featured: boolean;
  copy: Copy;
};

const SELLERS = [
  {
    id: "demo-bole-motors",
    name: "Bole Motors",
    city: "addis",
    kind: "dealer",
    bio: "Sample dealer profile for the preview yard.",
  },
  {
    id: "demo-rift-plant",
    name: "Rift Plant",
    city: "bahirdar",
    kind: "dealer",
    bio: "Sample machinery desk. Not a real supplier.",
  },
  {
    id: "demo-jimma-agri",
    name: "Jimma Agri",
    city: "jimma",
    kind: "dealer",
    bio: "Sample farm-equipment desk.",
  },
];

const LISTINGS: DemoListing[] = [
  {
    id: "demo-land-cruiser",
    seller: "demo-bole-motors",
    category: "cars",
    condition: "used",
    priceBirr: 8_450_000,
    city: "addis",
    year: 2018,
    make: "Toyota",
    model: "Land Cruiser",
    mileageKm: 92_000,
    hours: null,
    cover: "/media/land-cruiser.jpg",
    featured: true,
    copy: {
      en: [
        "2018 Toyota Land Cruiser V8",
        "Sample listing. A dark V8 kept in Addis, with service history described by the sample dealer. Not a vehicle you can buy.",
      ],
      om: [
        "2018 Toyota Land Cruiser V8",
        "Galmee fakkeenyaa. V8 gurraacha Finfinnee keessa kan qabame, seenaan tajaajilaa kan daldalaa fakkeenyaati. Konkolaataa bitamuu hin danda'amne.",
      ],
      am: [
        "2018 ቶዮታ ላንድ ክሩዘር ቪ8",
        "የናሙና ዝርዝር። በአዲስ አበባ የተያዘ ጥቁር ቪ8፣ የአገልግሎት ታሪኩ የናሙና ነጋዴ ገለጻ ነው። ሊገዛ የሚችል መኪና አይደለም።",
      ],
      so: [
        "2018 Toyota Land Cruiser V8",
        "Liis tijaabo ah. V8 madow oo Addis lagu hayo, taariikhda adeegga waxaa sharxay iibiyaha tijaabada. Ma aha baabuur la iibsan karo.",
      ],
    },
  },
  {
    id: "demo-hilux",
    seller: "demo-bole-motors",
    category: "cars",
    condition: "used",
    priceBirr: 4_200_000,
    city: "adama",
    year: 2020,
    make: "Toyota",
    model: "Hilux",
    mileageKm: 74_500,
    hours: null,
    cover: "/media/pickup.jpg",
    featured: true,
    copy: {
      en: [
        "2020 Toyota Hilux double cab",
        "Sample pickup listed in Adama. The odometer figure is demonstration data, not a promise.",
      ],
      om: [
        "2020 Toyota Hilux kaabin dachaa",
        "Piikaapii fakkeenyaa Adaamaa keessatti galmaa'e. Lakkoofsi fageenyaa odeeffannoo agarsiisaa qofa.",
      ],
      am: [
        "2020 ቶዮታ ሃይሉክስ ድርብ ካቢን",
        "በአዳማ የተዘረዘረ የናሙና ፒካፕ። የርቀት ቁጥሩ የማሳያ መረጃ ነው እንጂ ቃል አይደለም።",
      ],
      so: [
        "2020 Toyota Hilux kab laba-laab",
        "Pikab tijaabo ah oo Adama laga diiwaan geliyay. Tirada kilomitirka waa xog muuqaal ah, ma aha ballan.",
      ],
    },
  },
  {
    id: "demo-tucson",
    seller: "demo-bole-motors",
    category: "cars",
    condition: "used",
    priceBirr: 2_150_000,
    city: "hawassa",
    year: 2016,
    make: "Hyundai",
    model: "Tucson",
    mileageKm: 121_000,
    hours: null,
    cover: "/media/sedan.jpg",
    featured: false,
    copy: {
      en: [
        "2016 Hyundai Tucson",
        "Sample family car in Hawassa. Photos show the category, not this exact car.",
      ],
      om: [
        "2016 Hyundai Tucson",
        "Konkolaataa maatii fakkeenyaa Hawaasa. Suuraan garee agarsiisa, konkolaataa kana miti.",
      ],
      am: [
        "2016 ሁንዳይ ቱሳን",
        "በሀዋሳ የተቀመጠ የናሙና የቤተሰብ መኪና። ፎቶዎቹ ምድቡን ያሳያሉ እንጂ ይህንኑ መኪና አይደሉም።",
      ],
      so: [
        "2016 Hyundai Tucson",
        "Baabur qoys oo tijaabo ah oo Hawassa ah. Sawiradu waxay muujinayaan qaybta, ma aha baaburkan qudhiisa.",
      ],
    },
  },
  {
    id: "demo-isuzu",
    seller: "demo-rift-plant",
    category: "trucks",
    condition: "used",
    priceBirr: 3_800_000,
    city: "diredawa",
    year: 2015,
    make: "Isuzu",
    model: "FSR",
    mileageKm: 210_000,
    hours: null,
    cover: "/media/truck.jpg",
    featured: true,
    copy: {
      en: [
        "2015 Isuzu FSR cargo",
        "Sample commercial truck staged in Dire Dawa. No freight history is verified.",
      ],
      om: [
        "2015 Isuzu FSR fe'umsaa",
        "Konkolaataa fe'umsaa fakkeenyaa Dire Dawaa keessatti qophaa'e. Seenaan fe'umsaa hin mirkanoofne.",
      ],
      am: [
        "2015 ኢሱዙ ኤፍ ኤስ አር ጭነት",
        "በድሬዳዋ የተዘጋጀ የናሙና የንግድ መኪና። የጭነት ታሪክ አልተረጋገጠም።",
      ],
      so: [
        "2015 Isuzu FSR xamuul",
        "Gaadiid ganacsi oo tijaabo ah oo Dire Dawa lagu diyaariyay. Taariikhda xamuulka lama xaqiijin.",
      ],
    },
  },
  {
    id: "demo-excavator",
    seller: "demo-rift-plant",
    category: "machinery",
    condition: "used",
    priceBirr: 6_750_000,
    city: "addis",
    year: 2017,
    make: "Caterpillar",
    model: "320",
    mileageKm: null,
    hours: 6_400,
    cover: "/media/excavator.jpg",
    featured: true,
    copy: {
      en: [
        "2017 Caterpillar 320 excavator",
        "Sample excavator. Hour meter is demonstration data. It is not offered for hire or sale.",
      ],
      om: [
        "2017 Caterpillar 320 excavator",
        "Excavator fakkeenyaa. Lakkoofsi sa'aatii odeeffannoo agarsiisaati. Gurgurtaaf yookaan kireef hin dhiyaanne.",
      ],
      am: [
        "2017 ካተርፒላር 320 ኤክስካቫተር",
        "የናሙና ኤክስካቫተር። የሰዓት ቆጣሪው የማሳያ መረጃ ነው። ለሽያጭ ወይም ለኪራ አይቀርብም።",
      ],
      so: [
        "2017 Caterpillar 320 qodaye",
        "Qodaye tijaabo ah. Tirada saacadda waa xog muuqaal ah. Lama siinin kirayn ama iibin.",
      ],
    },
  },
  {
    id: "demo-loader",
    seller: "demo-rift-plant",
    category: "machinery",
    condition: "used",
    priceBirr: 3_400_000,
    city: "bahirdar",
    year: 2019,
    make: "SDLG",
    model: "L956",
    mileageKm: null,
    hours: 4_100,
    cover: "/media/loader.jpg",
    featured: false,
    copy: {
      en: [
        "2019 SDLG L956 wheel loader",
        "Sample loader near Bahir Dar. The photograph is a category image, not an inspection.",
      ],
      om: [
        "2019 SDLG L956 loader",
        "Loader fakkeenyaa Bahir Daar bira. Suuraan suuraa gareeti, qorannoo miti.",
      ],
      am: [
        "2019 ኤስ ዲ ኤል ጂ L956 ሎደር",
        "በባህር ዳር አቅራቢያ የተቀመጠ የናሙና ሎደር። ፎቶው የምድብ ምስል ነው እንጂ ምርመራ አይደለም።",
      ],
      so: [
        "2019 SDLG L956 loader",
        "Loader tijaabo ah oo u dhow Bahir Dar. Sawirku waa sawir qaybeed, ma aha kormeer.",
      ],
    },
  },
  {
    id: "demo-tractor",
    seller: "demo-jimma-agri",
    category: "agriculture",
    condition: "used",
    priceBirr: 1_850_000,
    city: "jimma",
    year: 2012,
    make: "Massey Ferguson",
    model: "385",
    mileageKm: null,
    hours: 5_200,
    cover: "/media/tractor.jpg",
    featured: true,
    copy: {
      en: [
        "2012 Massey Ferguson 385",
        "Sample tractor for the Jimma desk. It is labelled so it is never mistaken for stock on a real farm.",
      ],
      om: [
        "2012 Massey Ferguson 385",
        "Tiraaktara fakkeenyaa waajjira Jimmaa. Qonnaa dhugaa irratti akka hin fudhatamneef mallattaa'eera.",
      ],
      am: [
        "2012 ማሲ ፈርገሰን 385",
        "ለጅማ ጠረጴዛ የተዘጋጀ የናሙና ትራክተር። በእውነተኛ እርሻ ክምችት እንዳይሳሳት ምልክት ተደርጎበታል።",
      ],
      so: [
        "2012 Massey Ferguson 385",
        "Cagaf tijaabo ah oo miiska Jimma. Waxaa loo calaamadeeyay si aan loogu qaldamin kayd beer dhab ah.",
      ],
    },
  },
];

let seedTask: Promise<void> | null = null;

export function ensureDemoSeed(sql: Sql, source: "neon" | "pglite"): Promise<void> {
  if (source !== "pglite") return Promise.resolve();
  if (!seedTask) {
    seedTask = writeSeed(sql).catch((error) => {
      seedTask = null;
      throw error;
    });
  }
  return seedTask;
}

async function writeSeed(sql: Sql) {
  const existing = await sql<{ n: number }>`select count(*)::int as n from listings`;
  if (Number(existing[0]?.n ?? 0) > 0) return;

  for (const seller of SELLERS) {
    await sql`
      insert into seller_profiles (user_id, display_name, city, kind, bio, verified, is_demo)
      values (${seller.id}, ${seller.name}, ${seller.city}, ${seller.kind}, ${seller.bio}, false, true)
      on conflict (user_id) do nothing
    `;
  }

  for (const item of LISTINGS) {
    await sql`
      insert into listings (
        id, seller_user_id, category, status, condition, price_santim, currency, city,
        year, make, model, mileage_km, hours, cover_path, featured, is_demo, source_locale
      ) values (
        ${item.id}, ${item.seller}, ${item.category}, 'published', ${item.condition},
        ${item.priceBirr * 100}, 'ETB', ${item.city}, ${item.year}, ${item.make}, ${item.model},
        ${item.mileageKm}, ${item.hours}, ${item.cover}, ${item.featured}, true, 'en'
      )
      on conflict (id) do nothing
    `;
    for (const locale of ["en", "om", "am", "so"] as const) {
      const [title, summary] = item.copy[locale];
      await sql`
        insert into listing_translations (listing_id, locale, title, summary)
        values (${item.id}, ${locale}, ${title}, ${summary})
        on conflict (listing_id, locale) do nothing
      `;
    }
  }
}
