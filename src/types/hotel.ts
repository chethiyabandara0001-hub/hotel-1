export type BookingStatus =
  | 'Pending'
  | 'Awaiting payment'
  | 'Confirmed'
  | 'Cancelled'
  | 'Completed'
  | 'Expired';

export type PaymentMethod = 'pay_at_hotel' | 'online_deposit' | 'online_full';

export type PaymentStatus = 'Unpaid' | 'Deposit Paid' | 'Paid in Full' | 'Refunded' | 'Failed';

export interface HotelSettings {
  hotelName: string;
  tagline: string;
  locationShort: string;
  address: string;
  coordinatesLabel: string;
  googleMapsUrl: string;
  email: string;
  phone: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  checkInTime: string;
  checkOutTime: string;
  taxRatePercent: number;
  serviceChargePercent: number;
  payAtHotelEnabled: boolean;
  onlinePaymentConfigured: boolean;
  paymentProviderName: string;
  depositPercent: number;
  emailProviderConfigured: boolean;
  cancellationPolicy: string;
}

export interface RoomType {
  id: string;
  slug: string;
  indexLabel: string;
  name: string;
  category: string;
  badge?: string;
  shortMeta: string;
  description: string;
  featuredImage: string;
  gallery: string[];
  pricePerNightCents: number;
  maxGuests: number;
  maxAdults: number;
  maxChildren: number;
  bedTypes: string;
  roomSize: string;
  amenities: string[];
  rules: string[];
  availabilityStatus: 'available' | 'hidden' | 'maintenance';
}

export interface RoomUnit {
  id: string;
  unitNumber: string;
  roomTypeId: string;
  floor: string;
  maintenanceStatus: 'active' | 'maintenance';
  notes?: string;
}

export interface SeasonalRate {
  id: string;
  roomTypeId: string;
  label: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  nightlyPriceCents: number;
  minStayNights: number;
}

export interface RoomBlock {
  id: string;
  roomTypeId: string;
  roomUnitId?: string; // If omitted, blocks 1 unit of the roomType
  startDate: string;   // YYYY-MM-DD inclusive
  endDate: string;     // YYYY-MM-DD exclusive (checkout style)
  reason: string;
  createdAt: string;
}

export interface ReservationHold {
  id: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  expiresAt: number; // timestamp ms
}

export interface GuestInfo {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
}

export interface PriceBreakdown {
  nights: number;
  nightlyRates: { date: string; priceCents: number; rateLabel?: string }[];
  averageNightlyCents: number;
  subtotalCents: number;
  discountCode?: string;
  discountCents: number;
  taxRatePercent: number;
  taxCents: number;
  serviceChargePercent: number;
  serviceChargeCents: number;
  totalCents: number;
  depositDueCents: number;
}

export interface BookingRecord {
  id: string;
  reference: string; // e.g., SS-2026-000125
  roomTypeId: string;
  roomName: string;
  roomUnitId: string;
  roomUnitNumber: string;
  guestId: string;
  guest: GuestInfo;
  checkIn: string;  // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  nights: number;
  adults: number;
  children: number;
  totalGuests: number;
  specialRequests: string;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  pricing: PriceBreakdown;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  bookingReference: string;
  provider: string;
  transactionId: string;
  amountCents: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  method: PaymentMethod;
  createdAt: string;
}

export interface TransactionalEmailRecord {
  id: string;
  bookingReference: string;
  to: string;
  subject: string;
  type:
    | 'booking_request_received'
    | 'booking_confirmed'
    | 'payment_successful'
    | 'booking_cancelled'
    | 'arrival_reminder';
  deliveryStatus: 'queued_local_preview' | 'sent';
  htmlBody: string;
  createdAt: string;
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: 'booking' | 'cancellation' | 'enquiry' | 'system';
  reference?: string;
  read: boolean;
  createdAt: string;
}

export interface DiningEnquiry {
  id: string;
  name: string;
  email: string;
  date: string;
  guests: number;
  dietaryNotes: string;
  status: 'new' | 'confirmed' | 'archived';
  createdAt: string;
}

export interface ExperienceItem {
  id: string;
  numberLabel: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  duration: string;
  includedText: string;
  image: string;
  alt: string;
}

export interface WebsiteContent {
  hero: {
    eyebrow: string;
    titleLine1: string;
    titleLine2Em: string;
    copy: string;
    bottomMotto: string;
    sideCoordinates: string;
    backgroundImage: string;
  };
  bookingBarCaption: string;
  intro: {
    eyebrow: string;
    titleLine1: string;
    titleLine2Em: string;
    body: string;
    ctaText: string;
    sealText: string;
  };
  roomsHeading: {
    eyebrow: string;
    titleLine1: string;
    titleLine2Em: string;
    subtitle: string;
  };
  statement: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    titleLine3Em: string;
    titleLine4Em: string;
    body: string;
    ctaText: string;
    image: string;
    imageCaption: string;
  };
  experiencesHeading: {
    eyebrow: string;
    titleLine1: string;
    titleLine2Em: string;
    subtitle: string;
  };
  experiences: ExperienceItem[];
  dining: {
    eyebrow: string;
    titleLine1: string;
    titleLine2Em: string;
    body: string;
    ctaText: string;
    image: string;
    sampleMenu: { course: string; dish: string; note: string }[];
  };
  moments: {
    eyebrow: string;
    titleLine1: string;
    titleLine2Em: string;
    note: string;
    gallery: { url: string; alt: string; caption: string }[];
  };
  quotes: { text: string; author: string }[];
  location: {
    eyebrow: string;
    titleLine1: string;
    titleLine2Em: string;
    body: string;
    ctaText: string;
    image: string;
    bubbleTitle: string;
    bubbleLine1: string;
    bubbleLine2: string;
  };
  footer: {
    eyebrow: string;
    titleLine1: string;
    titleLine2Em: string;
    brandSummary: string;
    brandSubnote: string;
    copyrightSuffix: string;
    taglineRight: string;
  };
}

export interface RoomAvailabilityResult {
  roomType: RoomType;
  totalPhysicalUnits: number;
  activePhysicalUnits: number;
  reservedUnits: number;
  blockedUnits: number;
  heldUnits: number;
  availableUnits: number;
  isAvailable: boolean;
  capacityMet: boolean;
  minStayMet: boolean;
  minStayRequired: number;
  unavailabilityReason?: string;
  pricing: PriceBreakdown;
}

export interface HotelDatabaseState {
  settings: HotelSettings;
  roomTypes: RoomType[];
  roomUnits: RoomUnit[];
  seasonalRates: SeasonalRate[];
  roomBlocks: RoomBlock[];
  holds: ReservationHold[];
  bookings: BookingRecord[];
  payments: PaymentRecord[];
  emails: TransactionalEmailRecord[];
  notifications: AdminNotification[];
  diningEnquiries: DiningEnquiry[];
  content: WebsiteContent;
}
