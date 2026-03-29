export interface Product {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  images: {
    id: number;
    src: string;
    name: string;
    alt: string;
  }[];
  categories: {
    id: number;
    name: string;
    slug: string;
  }[];
  stock_status: string;
  attributes: {
    id: number;
    name: string;
    options: string[];
  }[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  image: {
    src: string;
  } | null;
  count: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Banner {
  id: string;
  url: string;
  title?: string;
  subtitle?: string;
  link?: string;
  order: number;
  active: boolean;
}

export interface Showroom {
  id: string;
  city: string;
  locationLink: string;
  whatsapp: string;
  phone: string;
  active: boolean;
}

export interface BankDetails {
  id: string;
  bankName: string;
  accountName: string;
  iban: string;
  accountNumber: string;
  active: boolean;
}

export interface CompanyInfo {
  name: string;
  taxNumber: string;
  commercialRegister: string;
}

export interface Order {
  id: string;
  userId?: string;
  customerName: string;
  customerEmail?: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'on-hold' | 'refunded' | 'failed';
  createdAt: string;
  billing: {
    first_name: string;
    last_name: string;
    address_1: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping_lines?: any[];
  payment_method: 'cod' | 'bank_transfer';
  payment_method_title: string;
  pickupShowroom?: Showroom;
  bankTransferInfo?: {
    receiptUrl: string;
    holderName: string;
  };
  companyInfo?: CompanyInfo;
  isCompany?: boolean;
}
