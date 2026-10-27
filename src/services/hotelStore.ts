import {
  AdminNotification,
  BookingRecord,
  BookingStatus,
  DiningEnquiry,
  GuestInfo,
  HotelDatabaseState,
  HotelSettings,
  PaymentMethod,
  PaymentRecord,
  PaymentStatus,
  PriceBreakdown,
  ReservationHold,
  RoomAvailabilityResult,
  RoomBlock,
  RoomType,
  RoomUnit,
  SeasonalRate,
  TransactionalEmailRecord,
  WebsiteContent,
} from '../types/hotel';

const STORAGE_KEY = 'salt_and_stone_hotel_db_v1';
const CHANNEL_NAME = 'salt_and_stone_sync_channel';

// Hotel local date helper (Asia/Colombo timezone)
export function getHotelTodayISO(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  }
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function diffNightsISO(checkIn: string, checkOut: string): number {
  const [y1, m1, d1] = checkIn.split('-').map(Number);
  const [y2, m2, d2] = checkOut.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / 86400000);
}

export function getNightsList(checkIn: string, checkOut: string): string[] {
  const nights = diffNightsISO(checkIn, checkOut);
  const list: string[] = [];
  for (let i = 0; i < nights; i++) {
    list.push(addDaysISO(checkIn, i));
  }
  return list;
}

export function formatCurrencyCents(cents: number, symbol = '$'): string {
  const dollars = cents / 100;
  return `${symbol}${dollars.toLocaleString('en-US', {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatMoneyExact(cents: number, symbol = '$'): string {
  const dollars = cents / 100;
  return `${symbol}${dollars.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildInitialSeedState(): HotelDatabaseState {
  const today = getHotelTodayISO();

  const settings: HotelSettings = {
    hotelName: 'Salt & Stone — Coastal House',
    tagline: 'A slower way to stay.',
    locationShort: 'Ahangama, Sri Lanka',
    address: 'Kabaragala Point, Galle Road, Ahangama 80650, Sri Lanka',
    coordinatesLabel: '05° 58′ N   /   THE SOUTH COAST',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Ahangama%2C%20Sri%20Lanka',
    email: 'stay@saltandstone.lk',
    phone: '+94 91 228 4500',
    currency: 'USD',
    currencySymbol: '$',
    timezone: 'Asia/Colombo',
    checkInTime: '14:00',
    checkOutTime: '11:00',
    taxRatePercent: 10,
    serviceChargePercent: 5,
    payAtHotelEnabled: true,
    onlinePaymentConfigured: false,
    paymentProviderName: 'PayHere Sri Lanka / Stripe',
    depositPercent: 30,
    emailProviderConfigured: false,
    cancellationPolicy:
      'Free cancellation up to 7 days prior to check-in. Cancellations within 7 days of arrival or non-arrivals are charged the first night plus applicable taxes.',
  };

  const roomTypes: RoomType[] = [
    {
      id: 'room-garden',
      slug: 'the-garden-room',
      indexLabel: 'ROOM 01 / 03',
      name: 'The Garden Room',
      category: 'Garden Sanctuary',
      badge: 'Our favorite',
      shortMeta: '2 guests   /   King bed   /   Private veranda',
      description:
        'Surrounded by wild heliconia, frangipani, and dappled palm shade, The Garden Room opens onto a private terracotta veranda. Hand-troweled lime walls, custom Sri Lankan teak joinery, and an open-sky courtyard rain shower invite unhurried mornings.',
      featuredImage:
        'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1050&q=82',
      gallery: [
        'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=85',
      ],
      pricePerNightCents: 18500,
      maxGuests: 2,
      maxAdults: 2,
      maxChildren: 1,
      bedTypes: '1 Artisanal Teak King Bed',
      roomSize: '48 m² (516 sq ft) including private veranda',
      amenities: [
        'Private walled garden veranda & daybed',
        'Open-air courtyard rain shower',
        '100% organic Belgian flax linen bedding',
        'Whisper-quiet inverter AC & brass ceiling fan',
        'Single-estate Ceylon loose-leaf tea & pour-over coffee bar',
        'Botanical bath amenities blended in Galle',
        'High-speed fiber Wi-Fi & Marshall speaker',
      ],
      rules: [
        'Check-in from 14:00 · Check-out by 11:00',
        'Maximum occupancy: 2 guests',
        'Non-smoking interior (veranda ashtrays available on request)',
        'Quiet garden hours observed after 22:00',
      ],
      availabilityStatus: 'available',
    },
    {
      id: 'room-ocean',
      slug: 'the-ocean-suite',
      indexLabel: 'ROOM 02 / 03',
      name: 'The Ocean Suite',
      category: 'Oceanfront Suite',
      badge: '',
      shortMeta: '2 guests   /   King bed   /   Ocean view',
      description:
        'Elevated on the upper coastal ridge with uninterrupted sightlines across the Indian Ocean reef break. Louvered timber shutters fold back completely so you can wake to the rhythm of the tide and watch dusk settle over the water from your private stone soaking tub.',
      featuredImage:
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1050&q=82',
      gallery: [
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1200&q=85',
      ],
      pricePerNightCents: 24500,
      maxGuests: 2,
      maxAdults: 2,
      maxChildren: 0,
      bedTypes: '1 Four-Poster Canopy King Bed facing the sea',
      roomSize: '64 m² (688 sq ft) with panoramic ocean terrace',
      amenities: [
        'Uninterrupted Indian Ocean & reef view terrace',
        'Hand-carved river stone soaking tub',
        '100% organic Belgian flax linen bedding',
        'Curated vinyl record player & coastal library',
        'Craft minibar with local small-batch spirits',
        'Complimentary morning fruit & king coconut delivery',
        'High-speed fiber Wi-Fi',
      ],
      rules: [
        'Check-in from 14:00 · Check-out by 11:00',
        'Designed for up to 2 adults (upper terrace architecture)',
        'Non-smoking suite',
      ],
      availabilityStatus: 'available',
    },
    {
      id: 'room-palm',
      slug: 'the-palm-residence',
      indexLabel: 'ROOM 03 / 03',
      name: 'The Palm Residence',
      category: 'Two-Bedroom Coastal Residence',
      badge: '',
      shortMeta: '4 guests   /   Two bedrooms   /   Terrace',
      description:
        'Our most expansive sanctuary for families, friends, or longer coastal stays. Featuring two independent en-suite king bedrooms connected by a breezy indoor-outdoor living pavilion, private dining loggia, and direct path through the coconut grove to the ocean.',
      featuredImage:
        'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1050&q=82',
      gallery: [
        'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=85',
      ],
      pricePerNightCents: 34500,
      maxGuests: 4,
      maxAdults: 4,
      maxChildren: 2,
      bedTypes: '2 En-Suite Teak King Beds + Living Pavilion Daybed',
      roomSize: '115 m² (1,237 sq ft) with wrap-around palm terrace',
      amenities: [
        'Two private en-suite king bedrooms',
        'Expansive outdoor dining loggia & lounging terrace',
        'Private garden plunge pool & sun deck',
        'Dedicated house host & private breakfast table service',
        'Full pantry with espresso machine & wine cooler',
        'Dual indoor and courtyard rain showers',
        'High-speed fiber Wi-Fi & surfboard rack',
      ],
      rules: [
        'Check-in from 14:00 · Check-out by 11:00',
        'Maximum occupancy: 4 guests (adults & children included)',
        'Private events require prior approval from the house manager',
      ],
      availabilityStatus: 'available',
    },
  ];

  // 5 Garden units, 4 Ocean units, 2 Palm units = 11 total physical units
  const roomUnits: RoomUnit[] = [
    { id: 'unit-g101', unitNumber: 'G-101', roomTypeId: 'room-garden', floor: 'Ground Garden', maintenanceStatus: 'active' },
    { id: 'unit-g102', unitNumber: 'G-102', roomTypeId: 'room-garden', floor: 'Ground Garden', maintenanceStatus: 'active' },
    { id: 'unit-g103', unitNumber: 'G-103', roomTypeId: 'room-garden', floor: 'Ground Garden', maintenanceStatus: 'active' },
    { id: 'unit-g104', unitNumber: 'G-104', roomTypeId: 'room-garden', floor: 'Ground Garden', maintenanceStatus: 'active' },
    { id: 'unit-g105', unitNumber: 'G-105', roomTypeId: 'room-garden', floor: 'Ground Garden', maintenanceStatus: 'active' },
    { id: 'unit-o201', unitNumber: 'O-201', roomTypeId: 'room-ocean', floor: 'Upper Ridge', maintenanceStatus: 'active' },
    { id: 'unit-o202', unitNumber: 'O-202', roomTypeId: 'room-ocean', floor: 'Upper Ridge', maintenanceStatus: 'active' },
    { id: 'unit-o203', unitNumber: 'O-203', roomTypeId: 'room-ocean', floor: 'Upper Ridge', maintenanceStatus: 'active' },
    { id: 'unit-o204', unitNumber: 'O-204', roomTypeId: 'room-ocean', floor: 'Upper Ridge', maintenanceStatus: 'active' },
    { id: 'unit-p301', unitNumber: 'P-301', roomTypeId: 'room-palm', floor: 'Palm Grove', maintenanceStatus: 'active' },
    { id: 'unit-p302', unitNumber: 'P-302', roomTypeId: 'room-palm', floor: 'Palm Grove', maintenanceStatus: 'active' },
  ];

  const seasonalRates: SeasonalRate[] = [
    {
      id: 'rate-peak-garden',
      roomTypeId: 'room-garden',
      label: 'South Coast Peak Season',
      startDate: '2026-12-15',
      endDate: '2027-01-15',
      nightlyPriceCents: 22500,
      minStayNights: 2,
    },
    {
      id: 'rate-peak-ocean',
      roomTypeId: 'room-ocean',
      label: 'South Coast Peak Season',
      startDate: '2026-12-15',
      endDate: '2027-01-15',
      nightlyPriceCents: 29500,
      minStayNights: 2,
    },
    {
      id: 'rate-peak-palm',
      roomTypeId: 'room-palm',
      label: 'South Coast Peak Season',
      startDate: '2026-12-15',
      endDate: '2027-01-15',
      nightlyPriceCents: 41000,
      minStayNights: 3,
    },
  ];

  const roomBlocks: RoomBlock[] = [];

  const bookings: BookingRecord[] = [
    {
      id: 'bk-1',
      reference: 'SS-2026-000121',
      roomTypeId: 'room-garden',
      roomName: 'The Garden Room',
      roomUnitId: 'unit-g101',
      roomUnitNumber: 'G-101',
      guestId: 'gst-1',
      guest: {
        id: 'gst-1',
        fullName: 'Clara Lindqvist',
        email: 'clara.lindqvist@nordicstudio.se',
        phone: '+46 70 123 4567',
        country: 'Sweden',
      },
      checkIn: today,
      checkOut: addDaysISO(today, 4),
      nights: 4,
      adults: 2,
      children: 0,
      totalGuests: 2,
      specialRequests: 'Late afternoon arrival from Colombo airport; herbal tea preferred.',
      status: 'Confirmed',
      paymentMethod: 'pay_at_hotel',
      paymentStatus: 'Paid in Full',
      transactionId: 'POS-SL-99412',
      pricing: {
        nights: 4,
        nightlyRates: [
          { date: today, priceCents: 18500 },
          { date: addDaysISO(today, 1), priceCents: 18500 },
          { date: addDaysISO(today, 2), priceCents: 18500 },
          { date: addDaysISO(today, 3), priceCents: 18500 },
        ],
        averageNightlyCents: 18500,
        subtotalCents: 74000,
        discountCents: 0,
        taxRatePercent: 10,
        taxCents: 7400,
        serviceChargePercent: 5,
        serviceChargeCents: 3700,
        totalCents: 85100,
        depositDueCents: 25530,
      },
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'bk-2',
      reference: 'SS-2026-000122',
      roomTypeId: 'room-ocean',
      roomName: 'The Ocean Suite',
      roomUnitId: 'unit-o201',
      roomUnitNumber: 'O-201',
      guestId: 'gst-2',
      guest: {
        id: 'gst-2',
        fullName: 'Julian Vance',
        email: 'jvance@atelier-london.co.uk',
        phone: '+44 7700 900412',
        country: 'United Kingdom',
      },
      checkIn: addDaysISO(today, -2),
      checkOut: addDaysISO(today, 2),
      nights: 4,
      adults: 2,
      children: 0,
      totalGuests: 2,
      specialRequests: 'Morning surf transfer inquiry for Kabalana reef.',
      status: 'Confirmed',
      paymentMethod: 'pay_at_hotel',
      paymentStatus: 'Deposit Paid',
      transactionId: 'BNK-SL-88310',
      pricing: {
        nights: 4,
        nightlyRates: [
          { date: addDaysISO(today, -2), priceCents: 24500 },
          { date: addDaysISO(today, -1), priceCents: 24500 },
          { date: today, priceCents: 24500 },
          { date: addDaysISO(today, 1), priceCents: 24500 },
        ],
        averageNightlyCents: 24500,
        subtotalCents: 98000,
        discountCents: 0,
        taxRatePercent: 10,
        taxCents: 9800,
        serviceChargePercent: 5,
        serviceChargeCents: 4900,
        totalCents: 112700,
        depositDueCents: 33810,
      },
      createdAt: new Date(Date.now() - 86400000 * 9).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'bk-3',
      reference: 'SS-2026-000123',
      roomTypeId: 'room-palm',
      roomName: 'The Palm Residence',
      roomUnitId: 'unit-p301',
      roomUnitNumber: 'P-301',
      guestId: 'gst-3',
      guest: {
        id: 'gst-3',
        fullName: 'Sora & Kenji Takahashi',
        email: 'sora.takahashi@kyotodesign.jp',
        phone: '+81 90 4432 1190',
        country: 'Japan',
      },
      checkIn: addDaysISO(today, -3),
      checkOut: today,
      nights: 3,
      adults: 3,
      children: 1,
      totalGuests: 4,
      specialRequests: 'Gluten-free breakfast selection.',
      status: 'Confirmed',
      paymentMethod: 'pay_at_hotel',
      paymentStatus: 'Paid in Full',
      transactionId: 'POS-SL-99104',
      pricing: {
        nights: 3,
        nightlyRates: [
          { date: addDaysISO(today, -3), priceCents: 34500 },
          { date: addDaysISO(today, -2), priceCents: 34500 },
          { date: addDaysISO(today, -1), priceCents: 34500 },
        ],
        averageNightlyCents: 34500,
        subtotalCents: 103500,
        discountCents: 0,
        taxRatePercent: 10,
        taxCents: 10350,
        serviceChargePercent: 5,
        serviceChargeCents: 5175,
        totalCents: 119025,
        depositDueCents: 35708,
      },
      createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    {
      id: 'bk-4',
      reference: 'SS-2026-000124',
      roomTypeId: 'room-ocean',
      roomName: 'The Ocean Suite',
      roomUnitId: 'unit-o202',
      roomUnitNumber: 'O-202',
      guestId: 'gst-4',
      guest: {
        id: 'gst-4',
        fullName: 'Amélie Moreau',
        email: 'amelie@studio-moreau.fr',
        phone: '+33 6 18 42 99 01',
        country: 'France',
      },
      checkIn: addDaysISO(today, 14),
      checkOut: addDaysISO(today, 17),
      nights: 3,
      adults: 2,
      children: 0,
      totalGuests: 2,
      specialRequests: 'Honeymoon stay — sunset table reservation requested on first evening.',
      status: 'Awaiting payment',
      paymentMethod: 'pay_at_hotel',
      paymentStatus: 'Unpaid',
      pricing: {
        nights: 3,
        nightlyRates: [
          { date: addDaysISO(today, 14), priceCents: 24500 },
          { date: addDaysISO(today, 15), priceCents: 24500 },
          { date: addDaysISO(today, 16), priceCents: 24500 },
        ],
        averageNightlyCents: 24500,
        subtotalCents: 73500,
        discountCents: 0,
        taxRatePercent: 10,
        taxCents: 7350,
        serviceChargePercent: 5,
        serviceChargeCents: 3675,
        totalCents: 84525,
        depositDueCents: 25358,
      },
      createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    },
  ];

  const payments: PaymentRecord[] = [
    {
      id: 'pay-1',
      bookingReference: 'SS-2026-000121',
      provider: 'Hotel Front Desk Settlement',
      transactionId: 'POS-SL-99412',
      amountCents: 85100,
      currency: 'USD',
      status: 'succeeded',
      method: 'pay_at_hotel',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'pay-2',
      bookingReference: 'SS-2026-000122',
      provider: 'Direct Bank Wire Deposit',
      transactionId: 'BNK-SL-88310',
      amountCents: 33810,
      currency: 'USD',
      status: 'succeeded',
      method: 'pay_at_hotel',
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    },
    {
      id: 'pay-3',
      bookingReference: 'SS-2026-000123',
      provider: 'Hotel Front Desk Settlement',
      transactionId: 'POS-SL-99104',
      amountCents: 119025,
      currency: 'USD',
      status: 'succeeded',
      method: 'pay_at_hotel',
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
  ];

  const content: WebsiteContent = {
    hero: {
      eyebrow: 'A QUIETER KIND OF COASTAL ESCAPE — EST. 2024',
      titleLine1: 'A slower',
      titleLine2Em: 'way to stay.',
      copy: 'Tucked between swaying palms and the Indian Ocean. A small, soulful place for days that feel entirely your own.',
      bottomMotto: 'Come as you are. Stay as you feel.',
      sideCoordinates: '05° 58′ N   /   THE SOUTH COAST',
      backgroundImage:
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=2400&q=88',
    },
    bookingBarCaption: 'A small place. An unhurried experience.   —   Direct Coastal House Reservations',
    intro: {
      eyebrow: '01   /   Welcome in',
      titleLine1: 'Not far away.',
      titleLine2Em: 'far enough.',
      body: 'Some places invite you to do more. Ours invites you to feel more. Bare feet, honest food, ocean air and the luxury of having absolutely nowhere else to be.',
      ctaText: 'Discover the feeling',
      sealText: 'Slow is a feeling, not a place.',
    },
    roomsHeading: {
      eyebrow: '02   /   Places to rest',
      titleLine1: 'Rooms with',
      titleLine2Em: 'room to breathe.',
      subtitle: 'Thoughtful spaces, earthy materials, and the quiet details that make you feel at home.',
    },
    statement: {
      eyebrow: 'More than a place to sleep',
      titleLine1: 'Less on',
      titleLine2: 'your mind.',
      titleLine3Em: 'More in',
      titleLine4Em: 'your soul.',
      body: 'Wake with the light. Take another swim. Read one more chapter. Every corner of the house is made for the beautiful art of doing very little.',
      ctaText: 'Find your pace',
      image:
        'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1350&q=85',
      imageCaption: 'HERE, THERE IS NO NEED TO RUSH.',
    },
    experiencesHeading: {
      eyebrow: '03   /   The little things',
      titleLine1: 'Stay for',
      titleLine2Em: 'the feeling.',
      subtitle: 'Small pleasures, beautifully simple. No itinerary required.',
    },
    experiences: [
      {
        id: 'exp-1',
        numberLabel: '01   —   SLOW MORNINGS',
        title: 'Let the day find you.',
        shortDescription: 'Long breakfasts, warm light and time that belongs only to you.',
        fullDescription:
          'Breakfast at Salt & Stone has no closing bell. Wake when the sunlight filters through the louvered teak shutters and wander to the garden veranda for warm hopper bowls, wood-fired sourdough, buffalo curd with kitul treacle, and single-estate Uva tea.',
        duration: 'Served daily · 07:30 until noon',
        includedText: 'Complimentary for all house guests',
        image:
          'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85',
        alt: 'Soft sunrise over a peaceful natural landscape',
      },
      {
        id: 'exp-2',
        numberLabel: '02   —   THE COAST',
        title: 'Follow the tide.',
        shortDescription: 'Saltwater adventures, hidden coves and barefoot walks at sunset.',
        fullDescription:
          'Step directly from our palm grove onto the warm sands of Ahangama. Whether paddling out to the gentle morning reef breaks at Kabalana, swimming in sheltered rock lagoons, or walking barefoot along the cove at dusk, the Indian Ocean sets the rhythm.',
        duration: 'Dawn & dusk coastal sessions',
        includedText: 'Hand-shaped longboards & reef snorkels available in the board room',
        image:
          'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=900&q=85',
        alt: 'Coastline and Indian Ocean waters',
      },
      {
        id: 'exp-3',
        numberLabel: '03   —   GOOD FOOD',
        title: 'Eat with the seasons.',
        shortDescription: 'Fresh, local ingredients and stories shared around a table.',
        fullDescription:
          'Each morning our kitchen gathers line-caught reef fish from Ahangama harbour alongside heirloom greens, wild lime, and cinnamon from our neighbouring organic estate. Evenings are spent around candlelit teak tables beneath the palms.',
        duration: 'Evening table · From 18:30',
        includedText: 'Daily changing coastal harvest menu & natural wine cellar',
        image:
          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85',
        alt: 'Fresh seasonal meal prepared with vibrant ingredients',
      },
    ],
    dining: {
      eyebrow: '04   /   At our table',
      titleLine1: 'Made slowly.',
      titleLine2Em: 'Shared gladly.',
      body: "From just-picked tropical fruit in the morning to the day's catch as the sky turns golden, every meal celebrates what this coast has to offer.",
      ctaText: 'Ask about dining',
      image:
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=85',
      sampleMenu: [
        {
          course: 'Morning Table',
          dish: 'Red Rice String Hoppers & Coconut Sambol',
          note: 'Served with slow-simmered kiri hodi, wood-apple jam, and estate pour-over.',
        },
        {
          course: 'Midday Light',
          dish: 'Charred Reef Octopus & Green Mango Salad',
          note: 'Crushed roasted peanuts, calamansi lime dressing, wild gotukola leaves.',
        },
        {
          course: 'Candlelit Supper',
          dish: 'Cinnamon-Wood Grilled Seer Fish',
          note: 'Tamarind glaze, heirloom pumpkin kalupol, and warm flatbreads.',
        },
      ],
    },
    moments: {
      eyebrow: '05   /   Little postcards',
      titleLine1: 'Collect moments.',
      titleLine2Em: 'Not things.',
      note: 'A collection of what it feels like to be here.',
      gallery: [
        {
          url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1050&q=82',
          alt: 'Lush tropical resort and refreshing blue pool',
          caption: 'Midday stillness by the courtyard saltwater pool.',
        },
        {
          url: 'https://images.unsplash.com/photo-1540202404-a2f29016b523?auto=format&fit=crop&w=600&q=82',
          alt: 'Palm-lined tropical coast',
          caption: 'Morning trade winds along Kabaragala Point.',
        },
        {
          url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=900&q=82',
          alt: 'Relaxed, warmly lit hotel interior',
          caption: 'Hand-finished lime plaster, local teak, and late afternoon light.',
        },
      ],
    },
    quotes: [
      {
        text: '“There is something beautiful about a place that asks nothing of you.”',
        author: 'A THOUGHT FROM THE HOUSE',
      },
      {
        text: '“A little salt in the air. A little more space in the day.”',
        author: 'OUR IDEA OF A GOOD HOLIDAY',
      },
      {
        text: '“The best days are the ones you never needed to plan.”',
        author: 'WORDS WE LIVE BY',
      },
    ],
    location: {
      eyebrow: '06   /   Find us',
      titleLine1: 'At the edge',
      titleLine2Em: 'ordinary.',
      body: "Down on Sri Lanka's southern coast, Ahangama moves to a gentler rhythm. It's the kind of place you arrive at once, and keep returning to in your mind.",
      ctaText: 'Explore Ahangama',
      image:
        'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1300&q=82',
      bubbleTitle: 'Somewhere in the south',
      bubbleLine1: 'Ahangama, Sri Lanka',
      bubbleLine2: 'Kabaragala Point · South Coast',
    },
    footer: {
      eyebrow: 'We saved you a place',
      titleLine1: 'Stay a little',
      titleLine2Em: 'longer.',
      brandSummary: 'A slower way to stay.\nAhangama, Sri Lanka.',
      brandSubnote: 'Boutique Coastal Sanctuary · 11 Private Rooms & Suites',
      copyrightSuffix: 'Salt & Stone — Coastal House Ahangama',
      taglineRight: 'Crafted for the unhurried.',
    },
  };

  const notifications: AdminNotification[] = [
    {
      id: 'notif-1',
      title: 'New Reservation Request — SS-2026-000124',
      message: 'Amélie Moreau booked The Ocean Suite (3 nights). Status: Awaiting payment.',
      type: 'booking',
      reference: 'SS-2026-000124',
      read: false,
      createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    },
    {
      id: 'notif-2',
      title: 'Today’s Arrival — G-101',
      message: 'Clara Lindqvist arriving today for 4 nights in The Garden Room.',
      type: 'system',
      reference: 'SS-2026-000121',
      read: false,
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
  ];

  return {
    settings,
    roomTypes,
    roomUnits,
    seasonalRates,
    roomBlocks,
    holds: [],
    bookings,
    payments,
    emails: [],
    notifications,
    diningEnquiries: [],
    content,
  };
}

let memoryState: HotelDatabaseState | null = null;
const listeners = new Set<() => void>();
let syncChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    syncChannel = new BroadcastChannel(CHANNEL_NAME);
    syncChannel.onmessage = () => {
      memoryState = null;
      loadDatabase();
      listeners.forEach((fn) => fn());
    };
  } catch {
    // ignore BroadcastChannel errors in restricted contexts
  }
}

export function loadDatabase(): HotelDatabaseState {
  if (memoryState) {
    // Clean expired holds automatically
    const now = Date.now();
    if (memoryState.holds.some((h) => h.expiresAt <= now)) {
      memoryState = {
        ...memoryState,
        holds: memoryState.holds.filter((h) => h.expiresAt > now),
      };
      persistDatabase(memoryState, false);
    }
    return memoryState;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as HotelDatabaseState;
      const now = Date.now();
      parsed.holds = (parsed.holds || []).filter((h) => h.expiresAt > now);
      memoryState = parsed;
      return parsed;
    }
  } catch (e) {
    console.error('Failed to read hotel database from localStorage:', e);
  }

  const seed = buildInitialSeedState();
  memoryState = seed;
  persistDatabase(seed, false);
  return seed;
}

export function persistDatabase(nextState: HotelDatabaseState, broadcast = true): void {
  memoryState = nextState;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  } catch (e) {
    console.error('Failed to save hotel database to localStorage:', e);
  }
  listeners.forEach((fn) => fn());
  if (broadcast && syncChannel) {
    try {
      syncChannel.postMessage({ updatedAt: Date.now() });
    } catch {
      // ignore
    }
  }
}

export function subscribeDatabase(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetDemoDatabase(): HotelDatabaseState {
  const fresh = buildInitialSeedState();
  persistDatabase(fresh, true);
  return fresh;
}

// Overlap rule: existingCheckIn < requestedCheckOut AND existingCheckOut > requestedCheckIn
export function datesOverlap(
  existingStart: string,
  existingEnd: string,
  reqStart: string,
  reqEnd: string
): boolean {
  return existingStart < reqEnd && existingEnd > reqStart;
}

export function calculateRoomPricing(
  roomType: RoomType,
  checkIn: string,
  checkOut: string,
  discountCode?: string,
  state: HotelDatabaseState = loadDatabase()
): PriceBreakdown {
  const nightsList = getNightsList(checkIn, checkOut);
  const nights = Math.max(1, nightsList.length);

  const nightlyRates = nightsList.map((nightDate) => {
    const matchingRate = state.seasonalRates.find(
      (r) =>
        r.roomTypeId === roomType.id &&
        nightDate >= r.startDate &&
        nightDate <= r.endDate
    );
    return {
      date: nightDate,
      priceCents: matchingRate ? matchingRate.nightlyPriceCents : roomType.pricePerNightCents,
      rateLabel: matchingRate?.label,
    };
  });

  const subtotalCents = nightlyRates.reduce((acc, n) => acc + n.priceCents, 0);
  const averageNightlyCents = Math.round(subtotalCents / nights);

  let discountCents = 0;
  const normalizedCode = (discountCode || '').trim().toUpperCase();
  if (normalizedCode === 'SLOWSTAY10') {
    discountCents = Math.round(subtotalCents * 0.1);
  } else if (normalizedCode === 'COASTAL15') {
    discountCents = Math.round(subtotalCents * 0.15);
  }

  const taxableBase = Math.max(0, subtotalCents - discountCents);
  const taxRatePercent = state.settings.taxRatePercent;
  const serviceChargePercent = state.settings.serviceChargePercent;

  const taxCents = Math.round((taxableBase * taxRatePercent) / 100);
  const serviceChargeCents = Math.round((taxableBase * serviceChargePercent) / 100);
  const totalCents = taxableBase + taxCents + serviceChargeCents;
  const depositDueCents = Math.round((totalCents * state.settings.depositPercent) / 100);

  return {
    nights,
    nightlyRates,
    averageNightlyCents,
    subtotalCents,
    discountCode: discountCents > 0 ? normalizedCode : undefined,
    discountCents,
    taxRatePercent,
    taxCents,
    serviceChargePercent,
    serviceChargeCents,
    totalCents,
    depositDueCents,
  };
}

export function checkRoomAvailability(
  checkIn: string,
  checkOut: string,
  guests: number,
  discountCode?: string,
  ignoreHoldId?: string
): {
  validRequest: boolean;
  validationError?: string;
  results: RoomAvailabilityResult[];
} {
  const state = loadDatabase();
  const today = getHotelTodayISO();

  if (!checkIn || !checkOut) {
    return {
      validRequest: false,
      validationError: 'Please select both check-in and check-out dates.',
      results: [],
    };
  }

  if (checkIn < today) {
    return {
      validRequest: false,
      validationError: `Check-in date cannot be in the past (current hotel date in ${state.settings.timezone}: ${today}).`,
      results: [],
    };
  }

  const nights = diffNightsISO(checkIn, checkOut);
  if (nights <= 0) {
    return {
      validRequest: false,
      validationError: 'Check-out date must be after check-in date.',
      results: [],
    };
  }

  if (guests < 1) {
    return {
      validRequest: false,
      validationError: 'At least 1 guest is required.',
      results: [],
    };
  }

  const now = Date.now();
  const nightsList = getNightsList(checkIn, checkOut);

  const results: RoomAvailabilityResult[] = state.roomTypes
    .filter((rt) => rt.availabilityStatus !== 'hidden')
    .map((roomType) => {
      const unitsForRoom = state.roomUnits.filter((u) => u.roomTypeId === roomType.id);
      const totalPhysicalUnits = unitsForRoom.length;
      const activeUnits = unitsForRoom.filter((u) => u.maintenanceStatus === 'active');
      const activePhysicalUnits = activeUnits.length;

      // Minimum stay check from seasonal rates
      let minStayRequired = 1;
      for (const night of nightsList) {
        const sr = state.seasonalRates.find(
          (r) => r.roomTypeId === roomType.id && night >= r.startDate && night <= r.endDate
        );
        if (sr && sr.minStayNights > minStayRequired) {
          minStayRequired = sr.minStayNights;
        }
      }
      const minStayMet = nights >= minStayRequired;
      const capacityMet = guests <= roomType.maxGuests;

      // Worst-case occupancy across all requested nights
      let maxReservedOnAnyNight = 0;
      let maxBlockedOnAnyNight = 0;
      let maxHeldOnAnyNight = 0;
      let minAvailableOnAnyNight = activePhysicalUnits;

      for (const night of nightsList) {
        const nextDay = addDaysISO(night, 1);

        const overlappingBookings = state.bookings.filter(
          (b) =>
            b.roomTypeId === roomType.id &&
            b.status !== 'Cancelled' &&
            b.status !== 'Expired' &&
            datesOverlap(b.checkIn, b.checkOut, night, nextDay)
        ).length;

        const overlappingBlocks = state.roomBlocks.filter(
          (blk) =>
            blk.roomTypeId === roomType.id &&
            datesOverlap(blk.startDate, blk.endDate, night, nextDay)
        ).length;

        const overlappingHolds = state.holds.filter(
          (h) =>
            h.roomTypeId === roomType.id &&
            h.id !== ignoreHoldId &&
            h.expiresAt > now &&
            datesOverlap(h.checkIn, h.checkOut, night, nextDay)
        ).length;

        maxReservedOnAnyNight = Math.max(maxReservedOnAnyNight, overlappingBookings);
        maxBlockedOnAnyNight = Math.max(maxBlockedOnAnyNight, overlappingBlocks);
        maxHeldOnAnyNight = Math.max(maxHeldOnAnyNight, overlappingHolds);

        const availThatNight = Math.max(
          0,
          activePhysicalUnits - overlappingBookings - overlappingBlocks - overlappingHolds
        );
        minAvailableOnAnyNight = Math.min(minAvailableOnAnyNight, availThatNight);
      }

      const pricing = calculateRoomPricing(roomType, checkIn, checkOut, discountCode, state);

      let unavailabilityReason: string | undefined;
      if (roomType.availabilityStatus === 'maintenance' || activePhysicalUnits === 0) {
        unavailabilityReason = 'Currently closed for seasonal maintenance.';
      } else if (!capacityMet) {
        unavailabilityReason = `Accommodates up to ${roomType.maxGuests} guests (${guests} selected).`;
      } else if (!minStayMet) {
        unavailabilityReason = `Minimum stay of ${minStayRequired} nights required for selected dates.`;
      } else if (minAvailableOnAnyNight <= 0) {
        unavailabilityReason = 'Fully reserved for one or more nights of your stay.';
      }

      const isAvailable =
        roomType.availabilityStatus === 'available' &&
        capacityMet &&
        minStayMet &&
        minAvailableOnAnyNight > 0;

      return {
        roomType,
        totalPhysicalUnits,
        activePhysicalUnits,
        reservedUnits: maxReservedOnAnyNight,
        blockedUnits: maxBlockedOnAnyNight,
        heldUnits: maxHeldOnAnyNight,
        availableUnits: minAvailableOnAnyNight,
        isAvailable,
        capacityMet,
        minStayMet,
        minStayRequired,
        unavailabilityReason,
        pricing,
      };
    });

  return {
    validRequest: true,
    results,
  };
}

export function createReservationHold(
  roomTypeId: string,
  checkIn: string,
  checkOut: string,
  guests: number,
  existingHoldId?: string
): { success: boolean; hold?: ReservationHold; error?: string } {
  const check = checkRoomAvailability(checkIn, checkOut, guests, undefined, existingHoldId);
  if (!check.validRequest) {
    return { success: false, error: check.validationError };
  }
  const target = check.results.find((r) => r.roomType.id === roomTypeId);
  if (!target || !target.isAvailable) {
    return {
      success: false,
      error: target?.unavailabilityReason || 'Selected room is no longer available for these dates.',
    };
  }

  const state = loadDatabase();
  const filteredHolds = state.holds.filter((h) => h.id !== existingHoldId);
  const hold: ReservationHold = {
    id: `hold-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    roomTypeId,
    checkIn,
    checkOut,
    guests,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10-minute atomic inventory hold
  };

  persistDatabase({
    ...state,
    holds: [...filteredHolds, hold],
  });

  return { success: true, hold };
}

export function releaseReservationHold(holdId?: string): void {
  if (!holdId) return;
  const state = loadDatabase();
  if (!state.holds.some((h) => h.id === holdId)) return;
  persistDatabase({
    ...state,
    holds: state.holds.filter((h) => h.id !== holdId),
  });
}

function buildBrandedEmailHtml(booking: BookingRecord, settings: HotelSettings, headline: string): string {
  return `
    <div style="background:#f5f2eb;padding:36px 28px;font-family:'DM Sans',Arial,sans-serif;color:#23302a;border:1px solid #d4d0c7;max-width:600px;margin:0 auto;">
      <div style="text-align:center;border-bottom:1px solid #d4d0c7;padding-bottom:20px;margin-bottom:24px;">
        <div style="font-family:'Playfair Display',Georgia,serif;font-size:28px;letter-spacing:-0.05em;">salt <i>&amp;</i> stone</div>
        <div style="font-size:9px;letter-spacing:0.32em;text-transform:uppercase;color:#74796f;margin-top:4px;">COASTAL HOUSE · AHANGAMA</div>
      </div>
      <div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#b27356;font-weight:700;margin-bottom:8px;">RESERVATION NOTICE</div>
      <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:400;font-size:28px;margin:0 0 14px;">${headline}</h2>
      <p style="font-size:13px;line-height:1.8;color:#5d655b;margin:0 0 22px;">
        Dear ${booking.guest.fullName},<br/>
        We have reserved a place for you at Salt &amp; Stone in Ahangama. Below are the verified details of your stay.
      </p>
      <div style="background:#fffaf2;border:1px solid #d4d0c7;padding:18px 20px;margin-bottom:20px;font-size:13px;line-height:1.8;">
        <div><strong>Booking Reference:</strong> ${booking.reference}</div>
        <div><strong>Status:</strong> ${booking.status} (${booking.paymentStatus})</div>
        <div><strong>Accommodation:</strong> ${booking.roomName} · Unit ${booking.roomUnitNumber}</div>
        <div><strong>Check-in:</strong> ${booking.checkIn} (from ${settings.checkInTime})</div>
        <div><strong>Check-out:</strong> ${booking.checkOut} (by ${settings.checkOutTime})</div>
        <div><strong>Duration &amp; Guests:</strong> ${booking.nights} night(s) · ${booking.totalGuests} guest(s)</div>
        <hr style="border:0;border-top:1px solid #e5e0d7;margin:12px 0;" />
        <div><strong>Total Stay Amount:</strong> ${formatMoneyExact(booking.pricing.totalCents, settings.currencySymbol)} (${settings.currency})</div>
      </div>
      <p style="font-size:11px;line-height:1.7;color:#74796f;margin:0;">
        <strong>Cancellation Policy:</strong> ${settings.cancellationPolicy}<br/>
        <strong>Contact:</strong> ${settings.address} · ${settings.phone} · ${settings.email}
      </p>
    </div>
  `.trim();
}

export interface CreateBookingInput {
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  guest: {
    fullName: string;
    email: string;
    phone: string;
    country: string;
  };
  specialRequests?: string;
  discountCode?: string;
  paymentMethod: PaymentMethod;
  holdId?: string;
}

export function createBookingReservation(input: CreateBookingInput): {
  success: boolean;
  booking?: BookingRecord;
  emailRecord?: TransactionalEmailRecord;
  error?: string;
} {
  const state = loadDatabase();
  const totalGuests = Number(input.adults) + Number(input.children || 0);

  // Server-equivalent validation
  const fullName = (input.guest.fullName || '').trim();
  const email = (input.guest.email || '').trim();
  const phone = (input.guest.phone || '').trim();
  const country = (input.guest.country || '').trim();

  if (fullName.length < 2) {
    return { success: false, error: 'Please enter the primary guest’s full name.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Please provide a valid email address.' };
  }
  if (phone.length < 6) {
    return { success: false, error: 'Please provide a valid contact phone number.' };
  }
  if (!country) {
    return { success: false, error: 'Please specify your country of residence.' };
  }

  // Validate payment method against hotel settings
  if (
    (input.paymentMethod === 'online_full' || input.paymentMethod === 'online_deposit') &&
    !state.settings.onlinePaymentConfigured
  ) {
    return {
      success: false,
      error:
        'Live online card gateway credentials are not configured yet. Please select "Pay at Hotel / Direct Bank Transfer" or configure merchant keys in Admin Settings.',
    };
  }

  if (input.paymentMethod === 'pay_at_hotel' && !state.settings.payAtHotelEnabled) {
    return {
      success: false,
      error: 'Pay at Hotel is currently disabled by hotel administration.',
    };
  }

  // Re-verify availability atomically
  const availability = checkRoomAvailability(
    input.checkIn,
    input.checkOut,
    totalGuests,
    input.discountCode,
    input.holdId
  );

  if (!availability.validRequest) {
    return { success: false, error: availability.validationError };
  }

  const roomResult = availability.results.find((r) => r.roomType.id === input.roomTypeId);
  if (!roomResult || !roomResult.isAvailable) {
    return {
      success: false,
      error:
        roomResult?.unavailabilityReason ||
        'This room is no longer available for the requested dates.',
    };
  }

  // Find a specific physical unit not occupied on any night of the stay
  const candidateUnits = state.roomUnits.filter(
    (u) => u.roomTypeId === input.roomTypeId && u.maintenanceStatus === 'active'
  );
  const assignedUnit =
    candidateUnits.find((unit) => {
      const hasBookingConflict = state.bookings.some(
        (b) =>
          b.roomUnitId === unit.id &&
          b.status !== 'Cancelled' &&
          b.status !== 'Expired' &&
          datesOverlap(b.checkIn, b.checkOut, input.checkIn, input.checkOut)
      );
      const hasBlockConflict = state.roomBlocks.some(
        (blk) =>
          blk.roomUnitId === unit.id &&
          datesOverlap(blk.startDate, blk.endDate, input.checkIn, input.checkOut)
      );
      return !hasBookingConflict && !hasBlockConflict;
    }) || candidateUnits[0];

  if (!assignedUnit) {
    return { success: false, error: 'No active physical room unit available for assignment.' };
  }

  // Generate unique sequential booking reference: SS-2026-000125
  const nextNumber = 121 + state.bookings.length + 1;
  const reference = `SS-2026-${String(nextNumber).padStart(6, '0')}`;

  const guestInfo: GuestInfo = {
    id: `gst-${Date.now()}`,
    fullName,
    email,
    phone,
    country,
  };

  let status: BookingStatus = 'Confirmed';
  let paymentStatus: PaymentStatus = 'Unpaid';
  let transactionId: string | undefined;
  const newPayments = [...state.payments];

  if (input.paymentMethod === 'online_full' && state.settings.onlinePaymentConfigured) {
    status = 'Confirmed';
    paymentStatus = 'Paid in Full';
    transactionId = `PG-${Date.now().toString().slice(-6)}`;
    newPayments.unshift({
      id: `pay-${Date.now()}`,
      bookingReference: reference,
      provider: state.settings.paymentProviderName,
      transactionId,
      amountCents: roomResult.pricing.totalCents,
      currency: state.settings.currency,
      status: 'succeeded',
      method: 'online_full',
      createdAt: new Date().toISOString(),
    });
  } else if (input.paymentMethod === 'online_deposit' && state.settings.onlinePaymentConfigured) {
    status = 'Confirmed';
    paymentStatus = 'Deposit Paid';
    transactionId = `PG-DEP-${Date.now().toString().slice(-6)}`;
    newPayments.unshift({
      id: `pay-${Date.now()}`,
      bookingReference: reference,
      provider: state.settings.paymentProviderName,
      transactionId,
      amountCents: roomResult.pricing.depositDueCents,
      currency: state.settings.currency,
      status: 'succeeded',
      method: 'online_deposit',
      createdAt: new Date().toISOString(),
    });
  } else {
    status = 'Confirmed';
    paymentStatus = 'Unpaid';
  }

  const nowIso = new Date().toISOString();
  const booking: BookingRecord = {
    id: `bk-${Date.now()}`,
    reference,
    roomTypeId: roomResult.roomType.id,
    roomName: roomResult.roomType.name,
    roomUnitId: assignedUnit.id,
    roomUnitNumber: assignedUnit.unitNumber,
    guestId: guestInfo.id,
    guest: guestInfo,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights: roomResult.pricing.nights,
    adults: Number(input.adults),
    children: Number(input.children || 0),
    totalGuests,
    specialRequests: (input.specialRequests || '').trim(),
    status,
    paymentMethod: input.paymentMethod,
    paymentStatus,
    transactionId,
    pricing: roomResult.pricing,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const emailRecord: TransactionalEmailRecord = {
    id: `eml-${Date.now()}`,
    bookingReference: reference,
    to: guestInfo.email,
    subject: `Reservation Confirmed (${reference}) — Salt & Stone Coastal House`,
    type: 'booking_confirmed',
    deliveryStatus: state.settings.emailProviderConfigured ? 'sent' : 'queued_local_preview',
    htmlBody: buildBrandedEmailHtml(booking, state.settings, 'Your coastal stay is confirmed.'),
    createdAt: nowIso,
  };

  const notification: AdminNotification = {
    id: `notif-${Date.now()}`,
    title: `New Reservation ${reference} — ${booking.roomName}`,
    message: `${guestInfo.fullName} (${guestInfo.country}) reserved ${booking.roomName} [${assignedUnit.unitNumber}] for ${booking.nights} night(s), ${booking.checkIn} → ${booking.checkOut}.`,
    type: 'booking',
    reference,
    read: false,
    createdAt: nowIso,
  };

  persistDatabase({
    ...state,
    holds: state.holds.filter((h) => h.id !== input.holdId),
    bookings: [booking, ...state.bookings],
    payments: newPayments,
    emails: [emailRecord, ...state.emails],
    notifications: [notification, ...state.notifications],
  });

  return {
    success: true,
    booking,
    emailRecord,
  };
}

export function findBookingByReference(
  reference: string,
  email?: string
): BookingRecord | undefined {
  const state = loadDatabase();
  const cleanRef = reference.trim().toUpperCase();
  return state.bookings.find((b) => {
    const refMatch = b.reference.toUpperCase() === cleanRef;
    if (!email || !email.trim()) return refMatch;
    return refMatch && b.guest.email.toLowerCase() === email.trim().toLowerCase();
  });
}

export function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  paymentStatus?: PaymentStatus
): BookingRecord | undefined {
  const state = loadDatabase();
  const target = state.bookings.find((b) => b.id === bookingId);
  if (!target) return undefined;

  const updated: BookingRecord = {
    ...target,
    status,
    paymentStatus: paymentStatus || target.paymentStatus,
    updatedAt: new Date().toISOString(),
  };

  const newEmails = [...state.emails];
  const newNotifications = [...state.notifications];

  if (status === 'Cancelled' && target.status !== 'Cancelled') {
    newEmails.unshift({
      id: `eml-${Date.now()}`,
      bookingReference: updated.reference,
      to: updated.guest.email,
      subject: `Reservation Cancelled (${updated.reference}) — Salt & Stone`,
      type: 'booking_cancelled',
      deliveryStatus: state.settings.emailProviderConfigured ? 'sent' : 'queued_local_preview',
      htmlBody: buildBrandedEmailHtml(
        updated,
        state.settings,
        'Your reservation has been cancelled.'
      ),
      createdAt: new Date().toISOString(),
    });
    newNotifications.unshift({
      id: `notif-${Date.now()}`,
      title: `Reservation Cancelled — ${updated.reference}`,
      message: `Inventory for ${updated.roomName} (${updated.roomUnitNumber}) from ${updated.checkIn} to ${updated.checkOut} has been released.`,
      type: 'cancellation',
      reference: updated.reference,
      read: false,
      createdAt: new Date().toISOString(),
    });
  }

  persistDatabase({
    ...state,
    bookings: state.bookings.map((b) => (b.id === bookingId ? updated : b)),
    emails: newEmails,
    notifications: newNotifications,
  });

  return updated;
}

export function updateBookingDetails(
  bookingId: string,
  updates: Partial<Pick<BookingRecord, 'roomUnitId' | 'roomUnitNumber' | 'specialRequests'>> & {
    guest?: Partial<GuestInfo>;
  }
): void {
  const state = loadDatabase();
  persistDatabase({
    ...state,
    bookings: state.bookings.map((b) => {
      if (b.id !== bookingId) return b;
      return {
        ...b,
        roomUnitId: updates.roomUnitId ?? b.roomUnitId,
        roomUnitNumber: updates.roomUnitNumber ?? b.roomUnitNumber,
        specialRequests: updates.specialRequests ?? b.specialRequests,
        guest: updates.guest ? { ...b.guest, ...updates.guest } : b.guest,
        updatedAt: new Date().toISOString(),
      };
    }),
  });
}

export function saveRoomType(room: RoomType): void {
  const state = loadDatabase();
  const exists = state.roomTypes.some((r) => r.id === room.id);
  const nextRooms = exists
    ? state.roomTypes.map((r) => (r.id === room.id ? room : r))
    : [...state.roomTypes, room];

  persistDatabase({
    ...state,
    roomTypes: nextRooms,
  });
}

export function addRoomUnit(roomTypeId: string, unitNumber: string, floor: string): void {
  const state = loadDatabase();
  const newUnit: RoomUnit = {
    id: `unit-${Date.now()}`,
    unitNumber: unitNumber.trim().toUpperCase(),
    roomTypeId,
    floor: floor.trim() || 'Ground',
    maintenanceStatus: 'active',
  };
  persistDatabase({
    ...state,
    roomUnits: [...state.roomUnits, newUnit],
  });
}

export function toggleRoomUnitMaintenance(unitId: string): void {
  const state = loadDatabase();
  persistDatabase({
    ...state,
    roomUnits: state.roomUnits.map((u) =>
      u.id === unitId
        ? {
            ...u,
            maintenanceStatus: u.maintenanceStatus === 'active' ? 'maintenance' : 'active',
          }
        : u
    ),
  });
}

export function addRoomBlock(block: Omit<RoomBlock, 'id' | 'createdAt'>): void {
  const state = loadDatabase();
  const newBlock: RoomBlock = {
    ...block,
    id: `blk-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  persistDatabase({
    ...state,
    roomBlocks: [newBlock, ...state.roomBlocks],
  });
}

export function removeRoomBlock(blockId: string): void {
  const state = loadDatabase();
  persistDatabase({
    ...state,
    roomBlocks: state.roomBlocks.filter((b) => b.id !== blockId),
  });
}

export function addSeasonalRate(rate: Omit<SeasonalRate, 'id'>): void {
  const state = loadDatabase();
  const newRate: SeasonalRate = {
    ...rate,
    id: `rate-${Date.now()}`,
  };
  persistDatabase({
    ...state,
    seasonalRates: [newRate, ...state.seasonalRates],
  });
}

export function removeSeasonalRate(rateId: string): void {
  const state = loadDatabase();
  persistDatabase({
    ...state,
    seasonalRates: state.seasonalRates.filter((r) => r.id !== rateId),
  });
}

export function updateWebsiteContent(content: WebsiteContent): void {
  const state = loadDatabase();
  persistDatabase({
    ...state,
    content,
  });
}

export function updateHotelSettings(settings: HotelSettings): void {
  const state = loadDatabase();
  persistDatabase({
    ...state,
    settings,
  });
}

export function createDiningEnquiry(
  input: Omit<DiningEnquiry, 'id' | 'status' | 'createdAt'>
): DiningEnquiry {
  const state = loadDatabase();
  const enquiry: DiningEnquiry = {
    ...input,
    id: `din-${Date.now()}`,
    status: 'new',
    createdAt: new Date().toISOString(),
  };
  const notif: AdminNotification = {
    id: `notif-${Date.now()}`,
    title: `Dining Table Enquiry — ${input.name}`,
    message: `${input.name} requested a table for ${input.guests} guest(s) on ${input.date}.`,
    type: 'enquiry',
    read: false,
    createdAt: new Date().toISOString(),
  };
  persistDatabase({
    ...state,
    diningEnquiries: [enquiry, ...state.diningEnquiries],
    notifications: [notif, ...state.notifications],
  });
  return enquiry;
}

export function markAllNotificationsRead(): void {
  const state = loadDatabase();
  persistDatabase({
    ...state,
    notifications: state.notifications.map((n) => ({ ...n, read: true })),
  });
}
