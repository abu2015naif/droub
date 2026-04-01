import { Product, Category } from "./types";

export const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 1001,
    name: "طفاية حريق بودرة 6 كجم",
    slug: "fire-extinguisher-6kg",
    permalink: "",
    description: "طفاية حريق عالية الجودة مناسبة للمكاتب والمنازل والمصانع. تتميز بسهولة الاستخدام والفعالية العالية في إخماد الحرائق من الفئات A و B و C.",
    short_description: "طفاية حريق بودرة جافة 6 كجم",
    price: "150",
    regular_price: "180",
    sale_price: "150",
    on_sale: true,
    images: [{ id: 1, src: "https://picsum.photos/seed/fire1/800", name: "طفاية", alt: "طفاية" }],
    categories: [{ id: 1, name: "أدوات السلامة", slug: "safety" }],
    stock_status: "instock",
    attributes: []
  },
  {
    id: 1002,
    name: "خوذة سلامة مهنية",
    slug: "safety-helmet",
    permalink: "",
    description: "خوذة حماية للرأس متوافقة مع معايير السلامة الدولية. مصنوعة من مواد عالية المقاومة للصدمات مع نظام تهوية مريح.",
    short_description: "خوذة حماية بيضاء للمهندسين والعمال",
    price: "45",
    regular_price: "45",
    sale_price: "",
    on_sale: false,
    images: [{ id: 2, src: "https://picsum.photos/seed/helmet/800", name: "خوذة", alt: "خوذة" }],
    categories: [{ id: 1, name: "أدوات السلامة", slug: "safety" }],
    stock_status: "instock",
    attributes: []
  },
  {
    id: 1003,
    name: "سترة سلامة عاكسة",
    slug: "safety-vest",
    permalink: "",
    description: "سترة عاكسة للضوء عالية الوضوح، ضرورية للعمل في المواقع الإنشائية والطرق لضمان رؤية العاملين بوضوح.",
    short_description: "سترة فسفورية عاكسة",
    price: "25",
    regular_price: "35",
    sale_price: "25",
    on_sale: true,
    images: [{ id: 3, src: "https://picsum.photos/seed/vest/800", name: "سترة", alt: "سترة" }],
    categories: [{ id: 1, name: "أدوات السلامة", slug: "safety" }],
    stock_status: "instock",
    attributes: []
  },
  {
    id: 1004,
    name: "حقيبة إسعافات أولية متكاملة",
    slug: "first-aid-kit",
    permalink: "",
    description: "حقيبة إسعافات أولية تحتوي على جميع المستلزمات الضرورية للتعامل مع الإصابات الطفيفة في المنزل أو العمل.",
    short_description: "حقيبة إسعافات أولية للطوارئ",
    price: "85",
    regular_price: "85",
    sale_price: "",
    on_sale: false,
    images: [{ id: 4, src: "https://picsum.photos/seed/aid/800", name: "حقيبة إسعافات", alt: "حقيبة إسعافات" }],
    categories: [{ id: 1, name: "أدوات السلامة", slug: "safety" }],
    stock_status: "instock",
    attributes: []
  },
  {
    id: 1005,
    name: "حذاء سلامة رياضي",
    slug: "safety-shoes",
    permalink: "",
    description: "حذاء سلامة بتصميم رياضي مريح مع مقدمة فولاذية لحماية الأصابع ونعل مقاوم للانزلاق والزيوت.",
    short_description: "حذاء سلامة خفيف ومريح",
    price: "120",
    regular_price: "150",
    sale_price: "120",
    on_sale: true,
    images: [{ id: 5, src: "https://picsum.photos/seed/shoes/800", name: "حذاء سلامة", alt: "حذاء سلامة" }],
    categories: [{ id: 1, name: "أدوات السلامة", slug: "safety" }],
    stock_status: "instock",
    attributes: []
  },
  {
    id: 1006,
    name: "قفازات عمل مقاومة للقطع",
    slug: "safety-gloves",
    permalink: "",
    description: "قفازات عالية الجودة توفر حماية ممتازة ضد القطع والخدوش أثناء العمل اليدوي الشاق.",
    short_description: "قفازات حماية يدوية",
    price: "35",
    regular_price: "35",
    sale_price: "",
    on_sale: false,
    images: [{ id: 6, src: "https://picsum.photos/seed/gloves/800", name: "قفازات", alt: "قفازات" }],
    categories: [{ id: 1, name: "أدوات السلامة", slug: "safety" }],
    stock_status: "instock",
    attributes: []
  }
];

export const SAMPLE_CATEGORIES: Category[] = [
  { id: 1, name: "أدوات السلامة", slug: "safety", parent: 0, description: "جميع أدوات السلامة الضرورية", image: null, count: 6 }
];
