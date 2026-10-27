import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookingRecord,
  ExperienceItem,
  HotelDatabaseState,
  PaymentMethod,
  ReservationHold,
  RoomType,
  TransactionalEmailRecord,
} from './types/hotel';
import {
  addDaysISO,
  checkRoomAvailability,
  createBookingReservation,
  createDiningEnquiry,
  createReservationHold,
  diffNightsISO,
  findBookingByReference,
  formatCurrencyCents,
  formatMoneyExact,
  getHotelTodayISO,
  loadDatabase,
  releaseReservationHold,
  subscribeDatabase,
  updateBookingStatus,
} from './services/hotelStore';
import { AdminDashboard } from './components/AdminDashboard';

export default function App() {
  const [db, setDb] = useState<HotelDatabaseState>(() => loadDatabase());
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');

  // Navigation & scroll state
  const [isHeaderFixed, setIsHeaderFixed] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Quote carousel
  const [activeQuoteIndex, setActiveQuoteIndex] = useState(0);

  // Booking Bar & Booking Engine State
  const today = useMemo(() => getHotelTodayISO(), []);
  const [checkIn, setCheckIn] = useState<string>(() => addDaysISO(today, 14));
  const [checkOut, setCheckOut] = useState<string>(() => addDaysISO(today, 17));
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);
  const totalGuests = adults + children;

  // Modals state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState<'availability' | 'guest_details' | 'confirmed'>(
    'availability'
  );
  const [selectedRoomId, setSelectedRoomId] = useState<string>('ANY');
  const [activeHold, setActiveHold] = useState<ReservationHold | null>(null);

  // Guest Form Fields
  const [guestFullName, setGuestFullName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestCountry, setGuestCountry] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pay_at_hotel');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRecord | null>(null);
  const [confirmedEmail, setConfirmedEmail] = useState<TransactionalEmailRecord | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  // Room Detail Modal
  const [inspectingRoom, setInspectingRoom] = useState<RoomType | null>(null);
  const [inspectGalleryIdx, setInspectGalleryIdx] = useState(0);

  // Experience Detail Modal
  const [inspectingExperience, setInspectingExperience] = useState<ExperienceItem | null>(null);

  // Dining Modal
  const [isDiningModalOpen, setIsDiningModalOpen] = useState(false);
  const [diningName, setDiningName] = useState('');
  const [diningEmail, setDiningEmail] = useState('');
  const [diningDate, setDiningDate] = useState(() => addDaysISO(today, 15));
  const [diningGuests, setDiningGuests] = useState(2);
  const [diningNotes, setDiningNotes] = useState('');
  const [diningSubmitted, setDiningSubmitted] = useState(false);

  // Lightbox Gallery Modal
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  // Lookup Booking Modal
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);
  const [lookupRef, setLookupRef] = useState('');
  const [lookupResult, setLookupResult] = useState<BookingRecord | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const roomScrollerRef = useRef<HTMLDivElement | null>(null);
  const openMenuBtnRef = useRef<HTMLButtonElement | null>(null);
  const closeMenuBtnRef = useRef<HTMLButtonElement | null>(null);

  // Subscribe to persistent database updates
  useEffect(() => {
    return subscribeDatabase(() => {
      setDb(loadDatabase());
    });
  }, []);

  // Sync URL navigation
  const navigateTo = (path: string, sectionId?: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
    }
    setIsMenuOpen(false);
    if (sectionId) {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    }
  };

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Handle direct route loading (/rooms, /booking, /contact)
  useEffect(() => {
    if (currentPath === '/rooms') {
      setTimeout(() => {
        document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else if (currentPath === '/booking') {
      setIsBookingModalOpen(true);
    } else if (currentPath === '/contact') {
      setTimeout(() => {
        document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [currentPath]);

  // Update canonical URL & page title dynamically
  useEffect(() => {
    const canonical = document.getElementById('canonicalLink') as HTMLLinkElement | null;
    if (canonical) {
      canonical.href = window.location.origin + currentPath;
    }
    if (currentPath === '/admin') {
      document.title = 'Admin Console — Salt & Stone Coastal House';
    } else {
      document.title = 'Salt & Stone — A Slower Way to Stay | Coastal House Ahangama';
    }
  }, [currentPath]);

  // Header scroll & active section observer
  useEffect(() => {
    if (currentPath === '/admin') return;
    const onScroll = () => {
      setIsHeaderFixed(window.scrollY > 95);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [currentPath]);

  // IntersectionObserver for [data-reveal] elements and section tracking
  useEffect(() => {
    if (currentPath === '/admin') return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealEls = document.querySelectorAll('[data-reveal]');

    if ('IntersectionObserver' in window && !reduceMotion) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              io.unobserve(entry.target);
            }
          });
        },
        { rootMargin: '0px 0px -65px 0px', threshold: 0.08 }
      );
      revealEls.forEach((el) => io.observe(el));

      const sectionIo = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.target.id) {
              setActiveSection(entry.target.id);
            }
          });
        },
        { threshold: 0.3 }
      );
      ['home', 'story', 'rooms', 'experiences', 'dining', 'moments', 'location', 'contact'].forEach(
        (id) => {
          const s = document.getElementById(id);
          if (s) sectionIo.observe(s);
        }
      );

      return () => {
        io.disconnect();
        sectionIo.disconnect();
      };
    } else {
      revealEls.forEach((el) => el.classList.add('visible'));
    }
  }, [currentPath, db.roomTypes.length]);

  // Lock body scroll when any overlay or menu is open
  const anyOverlayOpen =
    isMenuOpen ||
    isBookingModalOpen ||
    Boolean(inspectingRoom) ||
    Boolean(inspectingExperience) ||
    isDiningModalOpen ||
    lightboxIdx !== null ||
    isLookupModalOpen;

  useEffect(() => {
    document.body.classList.toggle('menu-open', isMenuOpen);
    document.body.classList.toggle('modal-open', anyOverlayOpen && !isMenuOpen);
    return () => {
      document.body.classList.remove('menu-open', 'modal-open');
    };
  }, [isMenuOpen, anyOverlayOpen]);

  // Global Escape key handler
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxIdx !== null) setLightboxIdx(null);
        else if (inspectingRoom) setInspectingRoom(null);
        else if (inspectingExperience) setInspectingExperience(null);
        else if (isDiningModalOpen) setIsDiningModalOpen(false);
        else if (isLookupModalOpen) setIsLookupModalOpen(false);
        else if (isBookingModalOpen) closeBookingModal();
        else if (isMenuOpen) {
          setIsMenuOpen(false);
          openMenuBtnRef.current?.focus();
        }
      } else if (lightboxIdx !== null) {
        if (e.key === 'ArrowRight') {
          setLightboxIdx((prev) =>
            prev !== null ? (prev + 1) % db.content.moments.gallery.length : null
          );
        } else if (e.key === 'ArrowLeft') {
          setLightboxIdx((prev) =>
            prev !== null
              ? (prev - 1 + db.content.moments.gallery.length) % db.content.moments.gallery.length
              : null
          );
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    lightboxIdx,
    inspectingRoom,
    inspectingExperience,
    isDiningModalOpen,
    isLookupModalOpen,
    isBookingModalOpen,
    isMenuOpen,
    db.content.moments.gallery.length,
  ]);

  // Automatic check-out adjustment when check-in changes
  const handleCheckInChange = (nextCheckIn: string) => {
    const validIn = nextCheckIn < today ? today : nextCheckIn;
    setCheckIn(validIn);
    if (!checkOut || checkOut <= validIn) {
      setCheckOut(addDaysISO(validIn, 1));
    }
  };

  // Real-time availability computation
  const availabilityReport = useMemo(() => {
    return checkRoomAvailability(
      checkIn,
      checkOut,
      totalGuests,
      discountCode,
      activeHold?.id
    );
  }, [checkIn, checkOut, totalGuests, discountCode, activeHold?.id, db]);

  const selectedRoomAvailability = useMemo(() => {
    if (selectedRoomId === 'ANY') {
      return availabilityReport.results.find((r) => r.isAvailable) || availabilityReport.results[0];
    }
    return (
      availabilityReport.results.find(
        (r) => r.roomType.id === selectedRoomId || r.roomType.name === selectedRoomId
      ) || availabilityReport.results[0]
    );
  }, [availabilityReport, selectedRoomId]);

  const openBookingEngine = (preferredRoomIdOrName?: string) => {
    setIsMenuOpen(false);
    setInspectingRoom(null);
    setBookingError(null);
    setConfirmedBooking(null);
    setConfirmedEmail(null);
    setShowEmailPreview(false);

    if (preferredRoomIdOrName) {
      const match = db.roomTypes.find(
        (r) => r.id === preferredRoomIdOrName || r.name === preferredRoomIdOrName
      );
      setSelectedRoomId(match ? match.id : 'ANY');
    } else {
      setSelectedRoomId('ANY');
    }

    setBookingStep('availability');
    setIsBookingModalOpen(true);
  };

  const closeBookingModal = () => {
    if (activeHold) {
      releaseReservationHold(activeHold.id);
      setActiveHold(null);
    }
    setIsBookingModalOpen(false);
    if (currentPath === '/booking') {
      navigateTo('/');
    }
  };

  const proceedToGuestDetails = (roomTypeId: string) => {
    setBookingError(null);
    const holdRes = createReservationHold(
      roomTypeId,
      checkIn,
      checkOut,
      totalGuests,
      activeHold?.id
    );
    if (!holdRes.success || !holdRes.hold) {
      setBookingError(holdRes.error || 'Could not hold inventory for this room.');
      return;
    }
    setSelectedRoomId(roomTypeId);
    setActiveHold(holdRes.hold);
    setBookingStep('guest_details');
  };

  const handleFinalizeBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    if (!selectedRoomAvailability) {
      setBookingError('Please select an available room.');
      return;
    }

    const res = createBookingReservation({
      roomTypeId: selectedRoomAvailability.roomType.id,
      checkIn,
      checkOut,
      adults,
      children,
      guest: {
        fullName: guestFullName,
        email: guestEmail,
        phone: guestPhone,
        country: guestCountry,
      },
      specialRequests,
      discountCode,
      paymentMethod,
      holdId: activeHold?.id,
    });

    if (!res.success || !res.booking) {
      setBookingError(res.error || 'Unable to complete booking.');
      return;
    }

    setActiveHold(null);
    setConfirmedBooking(res.booking);
    setConfirmedEmail(res.emailRecord || null);
    setBookingStep('confirmed');
  };

  const scrollRooms = (dir: -1 | 1) => {
    const scroller = roomScrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({
      left: dir * scroller.clientWidth * 0.8,
      behavior: 'smooth',
    });
  };

  // Render Admin Route
  if (currentPath === '/admin') {
    return <AdminDashboard db={db} onNavigatePublic={(p = '/') => navigateTo(p)} />;
  }

  // Render 404 Page for unrecognized routes
  const validPublicRoutes = ['/', '/rooms', '/booking', '/contact'];
  if (!validPublicRoutes.includes(currentPath)) {
    return (
      <div className="min-h-screen bg-[#172c27] text-[#f5f2eb] flex flex-col justify-between p-8 md:p-20">
        <div className="font-serif text-3xl">
          salt <i>&amp;</i> stone
        </div>
        <div className="max-w-xl">
          <span className="eyebrow light">404 &nbsp; / &nbsp; Off the coast</span>
          <h1 className="font-serif text-6xl md:text-7xl mt-4 mb-6">
            You’ve wandered past the cove.
          </h1>
          <p className="text-sm text-[#bcc9bd] leading-relaxed mb-8">
            The page you are looking for does not exist at Salt &amp; Stone. Let us guide you back to the house.
          </p>
          <button
            type="button"
            onClick={() => navigateTo('/')}
            className="outline-btn text-[#f5f2eb]"
          >
            <span>Return to the House</span>
            <span>→</span>
          </button>
        </div>
        <div className="text-[10px] tracking-[0.16em] uppercase text-[#a7b3aa]">
          Salt &amp; Stone — Ahangama, Sri Lanka
        </div>
      </div>
    );
  }

  const { content, settings } = db;
  const activeQuote = content.quotes[activeQuoteIndex] || content.quotes[0];

  return (
    <>
      <svg
        aria-hidden="true"
        style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      >
        <symbol id="i-arrow" viewBox="0 0 24 24">
          <path
            d="M5 12h14m-7-7 7 7-7 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="i-arrow-left" viewBox="0 0 24 24">
          <path
            d="M19 12H5m7-7-7 7 7 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="i-close" viewBox="0 0 24 24">
          <path
            d="M4 4l16 16M20 4 4 20"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
        </symbol>
        <symbol id="i-sun" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="5" fill="none" stroke="currentColor" />
          <path
            d="M16 1v8m0 14v8M1 16h8m14 0h8M5.4 5.4l5.7 5.7m9.8 9.8 5.7 5.7M26.6 5.4l-5.7 5.7m-9.8 9.8-5.7 5.7"
            stroke="currentColor"
            strokeWidth="1.1"
          />
        </symbol>
      </svg>

      {/* SITE HEADER */}
      <header className={`site-header ${isHeaderFixed ? 'is-fixed' : ''}`} id="siteHeader">
        <div className="header-left">
          <span className="location">
            <span className="header-dot" /> {settings.locationShort}
          </span>
        </div>

        <a
          className="logo"
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            navigateTo('/', 'home');
          }}
          aria-label="Salt and Stone, home"
        >
          salt <i>&amp;</i> stone
          <small>coastal house</small>
        </a>

        <div className="header-right">
          <a
            className={`header-link ${activeSection === 'rooms' ? 'active' : ''}`}
            href="#rooms"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('/rooms', 'rooms');
            }}
          >
            The rooms
          </a>
          <a
            className={`header-link ${activeSection === 'story' ? 'active' : ''}`}
            href="#story"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('/', 'story');
            }}
          >
            Our story
          </a>
          <button
            type="button"
            className="header-link"
            onClick={() => {
              setLookupError(null);
              setLookupResult(null);
              setIsLookupModalOpen(true);
            }}
          >
            My booking
          </button>
          <button
            ref={openMenuBtnRef}
            className="menu-trigger"
            id="openMenu"
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={isMenuOpen}
            onClick={() => {
              setIsMenuOpen(true);
              setTimeout(() => closeMenuBtnRef.current?.focus(), 50);
            }}
          >
            <span>Menu</span>
            <span className="hamb">
              <span />
              <span />
            </span>
          </button>
        </div>
      </header>

      <main>
        {/* HERO SECTION */}
        <section className="hero" id="home" aria-label="Coastal boutique hotel welcome">
          <div
            className="hero-photo"
            role="img"
            aria-label="Tropical resort pool and palms"
            style={{
              backgroundImage: `linear-gradient(90deg,rgba(19,34,27,.45) 0%,rgba(19,34,27,.08) 65%),linear-gradient(0deg,rgba(17,31,25,.35),transparent 42%),url('${content.hero.backgroundImage}')`,
            }}
          />
          <div className="hero-content">
            <div className="fine">{content.hero.eyebrow}</div>
            <h1>
              {content.hero.titleLine1}
              <br />
              <em>{content.hero.titleLine2Em}</em>
            </h1>
            <p className="hero-copy">{content.hero.copy}</p>
          </div>
          <div className="hero-bottom-left">
            <span className="sun-mark">
              <svg width="23" height="23">
                <use href="#i-sun" />
              </svg>
            </span>
            <span>{content.hero.bottomMotto}</span>
          </div>
          <div className="hero-side">{content.hero.sideCoordinates}</div>
        </section>

        {/* BOOKING BAR */}
        <form
          className="booking-bar"
          id="bookingBar"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            openBookingEngine();
          }}
        >
          <div className="booking-col">
            <label htmlFor="arrival">Check in</label>
            <input
              id="arrival"
              type="date"
              min={today}
              value={checkIn}
              onChange={(e) => handleCheckInChange(e.target.value)}
              required
              aria-label="Check-in date"
            />
          </div>
          <div className="booking-col">
            <label htmlFor="departure">Check out</label>
            <input
              id="departure"
              type="date"
              min={addDaysISO(checkIn || today, 1)}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              required
              aria-label="Check-out date"
            />
          </div>
          <div className="booking-col">
            <label htmlFor="guests">Guests</label>
            <select
              id="guests"
              aria-label="Number of guests"
              value={adults}
              onChange={(e) => {
                setAdults(Number(e.target.value));
                setChildren(0);
              }}
            >
              <option value={1}>1 guest</option>
              <option value={2}>2 guests</option>
              <option value={3}>3 guests</option>
              <option value={4}>4 guests</option>
              <option value={5}>5 guests</option>
              <option value={6}>6 guests</option>
            </select>
          </div>
          <button className="booking-cta" type="submit">
            <span>Plan your stay</span>
            <svg>
              <use href="#i-arrow" />
            </svg>
          </button>
        </form>
        <div className="booking-caption">{content.bookingBarCaption}</div>

        {/* INTRO / STORY SECTION */}
        <section className="intro" id="story">
          <div className="intro-label eyebrow" data-reveal>
            {content.intro.eyebrow}
          </div>
          <div className="intro-body" data-reveal>
            <h2>
              {content.intro.titleLine1}
              <br />
              Just <em>{content.intro.titleLine2Em}</em>
            </h2>
            <div className="intro-row">
              <p>{content.intro.body}</p>
              <a className="text-link" href="#experiences">
                {content.intro.ctaText}{' '}
                <svg>
                  <use href="#i-arrow" />
                </svg>
              </a>
            </div>
          </div>
          <div className="intro-seal" aria-hidden="true">
            {content.intro.sealText}
          </div>
        </section>

        {/* ROOMS SECTION */}
        <section className="room-section" id="rooms">
          <div className="section-heading">
            <div data-reveal>
              <span className="eyebrow">{content.roomsHeading.eyebrow}</span>
              <h2>
                {content.roomsHeading.titleLine1}
                <br />
                <em>{content.roomsHeading.titleLine2Em}</em>
              </h2>
            </div>
            <p data-reveal>{content.roomsHeading.subtitle}</p>
          </div>

          <div
            ref={roomScrollerRef}
            className="rooms-scroller"
            id="roomScroller"
            tabIndex={0}
            aria-label="Browse accommodation options"
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') scrollRooms(1);
              if (e.key === 'ArrowLeft') scrollRooms(-1);
            }}
          >
            {availabilityReport.results.map((item) => {
              const { roomType, availableUnits, isAvailable, pricing } = item;
              return (
                <article className="room" key={roomType.id}>
                  <div
                    className="room-photo"
                    onClick={() => {
                      setInspectingRoom(roomType);
                      setInspectGalleryIdx(0);
                    }}
                  >
                    <img
                      src={roomType.featuredImage}
                      alt={roomType.name}
                      loading="lazy"
                    />
                    {roomType.badge && <span className="room-badge">{roomType.badge}</span>}
                    <span
                      className={`room-avail-pill ${!isAvailable ? 'sold-out' : ''}`}
                    >
                      {isAvailable
                        ? `${availableUnits} unit${availableUnits === 1 ? '' : 's'} free`
                        : 'Unavailable for dates'}
                    </span>
                  </div>
                  <div className="room-content">
                    <span className="room-index">{roomType.indexLabel}</span>
                    <h3
                      className="room-name"
                      onClick={() => {
                        setInspectingRoom(roomType);
                        setInspectGalleryIdx(0);
                      }}
                    >
                      {roomType.name}
                    </h3>
                    <div className="room-meta">
                      <span>{roomType.shortMeta}</span>
                      <span className="room-price">
                        From{' '}
                        <b>
                          {formatCurrencyCents(
                            pricing.averageNightlyCents,
                            settings.currencySymbol
                          )}
                        </b>{' '}
                        / night*
                      </span>
                    </div>
                    <button
                      className="room-action"
                      type="button"
                      onClick={() => {
                        setInspectingRoom(roomType);
                        setInspectGalleryIdx(0);
                      }}
                    >
                      Explore this room{' '}
                      <svg>
                        <use href="#i-arrow" />
                      </svg>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="room-controls">
            <span>
              SCROLL TO EXPLORE &nbsp; · &nbsp; *LIVE RATES FOR {diffNightsISO(checkIn, checkOut)}{' '}
              NIGHT(S) ({checkIn} → {checkOut})
            </span>
            <button
              className="circle-btn"
              id="roomsPrev"
              type="button"
              aria-label="Previous room"
              onClick={() => scrollRooms(-1)}
            >
              <svg>
                <use href="#i-arrow-left" />
              </svg>
            </button>
            <button
              className="circle-btn"
              id="roomsNext"
              type="button"
              aria-label="Next room"
              onClick={() => scrollRooms(1)}
            >
              <svg>
                <use href="#i-arrow" />
              </svg>
            </button>
          </div>
        </section>

        {/* STATEMENT SECTION */}
        <section className="statement">
          <div className="statement-visual">
            <img
              src={content.statement.image}
              loading="lazy"
              alt="Serene tropical pool surrounded by palm trees and natural materials"
            />
            <span className="image-caption">{content.statement.imageCaption}</span>
          </div>
          <div className="statement-copy" data-reveal>
            <span className="eyebrow light">{content.statement.eyebrow}</span>
            <h2>
              {content.statement.titleLine1}
              <br />
              {content.statement.titleLine2}
              <br />
              <em>
                {content.statement.titleLine3Em}
                <br />
                {content.statement.titleLine4Em}
              </em>
            </h2>
            <p>{content.statement.body}</p>
            <a className="text-link" href="#moments">
              {content.statement.ctaText}{' '}
              <svg>
                <use href="#i-arrow" />
              </svg>
            </a>
          </div>
        </section>

        {/* EXPERIENCES SECTION */}
        <section className="experiences" id="experiences">
          <div className="section-heading">
            <div data-reveal>
              <span className="eyebrow">{content.experiencesHeading.eyebrow}</span>
              <h2>
                {content.experiencesHeading.titleLine1}
                <br />
                <em>{content.experiencesHeading.titleLine2Em}</em>
              </h2>
            </div>
            <p data-reveal>{content.experiencesHeading.subtitle}</p>
          </div>

          <div className="experience-grid">
            {content.experiences.map((exp) => (
              <article
                className="experience"
                key={exp.id}
                data-reveal
                onClick={() => setInspectingExperience(exp)}
              >
                <div className="experience-photo">
                  <img src={exp.image} alt={exp.alt} loading="lazy" />
                </div>
                <span className="experience-number">{exp.numberLabel}</span>
                <h3>{exp.title}</h3>
                <p>{exp.shortDescription}</p>
              </article>
            ))}
          </div>
        </section>

        {/* DINING SECTION */}
        <section className="dining" id="dining">
          <div className="dining-content" data-reveal>
            <span className="eyebrow">{content.dining.eyebrow}</span>
            <h2>
              {content.dining.titleLine1}
              <br />
              <em>{content.dining.titleLine2Em}</em>
            </h2>
            <p>{content.dining.body}</p>
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setDiningSubmitted(false);
                setIsDiningModalOpen(true);
              }}
            >
              {content.dining.ctaText}{' '}
              <svg>
                <use href="#i-arrow" />
              </svg>
            </button>
          </div>
          <div className="dining-image">
            <img
              src={content.dining.image}
              loading="lazy"
              alt="Inviting restaurant table set for a warm evening meal"
            />
          </div>
        </section>

        {/* MOMENTS / GALLERY SECTION */}
        <section className="moments" id="moments">
          <span className="eyebrow" data-reveal>
            {content.moments.eyebrow}
          </span>
          <h2 data-reveal>
            {content.moments.titleLine1}
            <br />
            <em>{content.moments.titleLine2Em}</em>
          </h2>
          <div className="moments-grid">
            {content.moments.gallery.slice(0, 3).map((item, idx) => (
              <figure
                key={idx}
                onClick={() => setLightboxIdx(idx)}
                title="Click to view full-screen photograph"
              >
                <img src={item.url} loading="lazy" alt={item.alt} />
              </figure>
            ))}
          </div>
          <div className="moments-note">
            {content.moments.note} &nbsp; · &nbsp;{' '}
            <button
              type="button"
              onClick={() => setLightboxIdx(0)}
              className="underline uppercase tracking-widest text-[10px] font-bold bg-transparent border-0"
            >
              Open Gallery Viewer
            </button>
          </div>
        </section>

        {/* QUOTE SECTION */}
        <section className="quote-section" aria-label="Guest-inspired sentiments">
          <span className="eyebrow">Words to come home to</span>
          <blockquote className="quote" id="quoteText">
            {activeQuote?.text}
          </blockquote>
          <span className="quote-author" id="quoteAuthor">
            {activeQuote?.author}
          </span>
          <div className="quote-dots">
            {content.quotes.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`quote-dot ${idx === activeQuoteIndex ? 'active' : ''}`}
                aria-label={`Show quote ${idx + 1}`}
                aria-pressed={idx === activeQuoteIndex}
                onClick={() => setActiveQuoteIndex(idx)}
              />
            ))}
          </div>
        </section>

        {/* LOCATION SECTION */}
        <section className="location-section" id="location">
          <div className="location-copy" data-reveal>
            <span className="eyebrow">{content.location.eyebrow}</span>
            <h2>
              {content.location.titleLine1}
              <br />
              of <em>{content.location.titleLine2Em}</em>
            </h2>
            <p>{content.location.body}</p>
            <a
              className="text-link"
              href={settings.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {content.location.ctaText}{' '}
              <svg>
                <use href="#i-arrow" />
              </svg>
            </a>
          </div>
          <div className="location-media">
            <img
              src={content.location.image}
              loading="lazy"
              alt="Sun-drenched tropical Sri Lankan coastline"
            />
            <div className="location-bubble">
              <strong>{content.location.bubbleTitle}</strong>
              {content.location.bubbleLine1}
              <br />
              {content.location.bubbleLine2}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="footer" id="contact">
        <div className="footer-top">
          <div>
            <span className="eyebrow light">{content.footer.eyebrow}</span>
            <h2 className="footer-title">
              {content.footer.titleLine1}
              <br />
              <em>{content.footer.titleLine2Em}</em>
            </h2>
          </div>
          <button
            className="footer-book"
            type="button"
            onClick={() => openBookingEngine()}
          >
            <span>
              <svg>
                <use href="#i-arrow" />
              </svg>
              Plan
              <br />
              your stay
            </span>
          </button>
        </div>

        <div className="footer-bottom">
          <div className="footer-col">
            <div className="foot-brand">salt &amp; stone</div>
            <p>
              A slower way to stay.
              <br />
              {settings.address}
              <br />
              <span>
                {settings.phone} &nbsp; · &nbsp; {settings.email}
              </span>
              <br />
              <small>{content.footer.brandSubnote}</small>
            </p>
          </div>
          <div className="footer-col">
            <h4>Explore</h4>
            <a href="#story">The house</a>
            <a href="#rooms">Our rooms</a>
            <a href="#experiences">Experiences</a>
            <a href="#dining">Dining</a>
          </div>
          <div className="footer-col">
            <h4>Find your way</h4>
            <a href="#location">Our location</a>
            <button
              type="button"
              className="footer-link-btn"
              onClick={() => openBookingEngine()}
            >
              Book a stay
            </button>
            <button
              type="button"
              className="footer-link-btn"
              onClick={() => {
                setLookupError(null);
                setLookupResult(null);
                setIsLookupModalOpen(true);
              }}
            >
              Manage my booking
            </button>
            <button
              type="button"
              className="footer-link-btn"
              onClick={() => navigateTo('/admin')}
            >
              Admin portal
            </button>
            <a href="#home">Back to top ↑</a>
          </div>
        </div>

        <div className="foot-note">
          <span>
            © {new Date().getFullYear()} {content.footer.copyrightSuffix}
          </span>
          <span>
            {content.footer.taglineRight} &nbsp; · &nbsp;{' '}
            <button type="button" onClick={() => navigateTo('/admin')}>
              Hotel Admin (/admin)
            </button>
          </span>
        </div>
      </footer>

      {/* FULL-SCREEN NAVIGATION MENU PANEL */}
      <nav
        className={`menu-panel ${isMenuOpen ? 'open' : ''}`}
        id="menuPanel"
        aria-label="Expanded navigation"
        aria-hidden={!isMenuOpen}
      >
        <div className="menu-top">
          <span className="logo" style={{ position: 'relative' }}>
            salt <i>&amp;</i> stone
          </span>
          <button
            ref={closeMenuBtnRef}
            className="menu-close"
            id="closeMenu"
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              openMenuBtnRef.current?.focus();
            }}
          >
            <span>Close</span>
            <svg>
              <use href="#i-close" />
            </svg>
          </button>
        </div>

        <div className="menu-main">
          <div className="menu-items">
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('/', 'home');
              }}
            >
              <sup>01</sup> Home
            </a>
            <a
              href="#story"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('/', 'story');
              }}
            >
              <sup>02</sup> Our story
            </a>
            <a
              href="#rooms"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('/rooms', 'rooms');
              }}
            >
              <sup>03</sup> The rooms
            </a>
            <a
              href="#experiences"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('/', 'experiences');
              }}
            >
              <sup>04</sup> Experiences
            </a>
            <a
              href="#dining"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('/', 'dining');
              }}
            >
              <sup>05</sup> Dining
            </a>
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('/contact', 'contact');
              }}
            >
              <sup>06</sup> Get in touch
            </a>
          </div>

          <div className="menu-aside">
            <span className="eyebrow light">Find your quiet</span>
            <p>
              Sea air. Open skies.
              <br />
              And a little more time to yourself.
            </p>
            <div className="flex flex-col items-start gap-4 mt-4">
              <button
                className="text-link"
                type="button"
                style={{ color: '#e9dfd0' }}
                onClick={() => openBookingEngine()}
              >
                Plan a stay{' '}
                <svg>
                  <use href="#i-arrow" />
                </svg>
              </button>
              <button
                className="text-link"
                type="button"
                style={{ color: '#b9c3b8' }}
                onClick={() => navigateTo('/admin')}
              >
                Staff &amp; Admin Console (/admin){' '}
                <svg>
                  <use href="#i-arrow" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ROOM DETAIL MODAL */}
      {inspectingRoom && (
        <div
          className="modal-wrap open"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectingRoom(null);
          }}
        >
          <div
            className="book-modal wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="roomDetailTitle"
          >
            <button
              className="modal-close"
              type="button"
              aria-label="Close room details"
              onClick={() => setInspectingRoom(null)}
            >
              <svg>
                <use href="#i-close" />
              </svg>
            </button>

            <span className="eyebrow">
              {inspectingRoom.indexLabel} &nbsp; / &nbsp; {inspectingRoom.category}
            </span>
            <h2 id="roomDetailTitle">{inspectingRoom.name}</h2>
            <p>{inspectingRoom.description}</p>

            {/* Interactive Gallery */}
            <div className="mb-6">
              <div className="aspect-[16/9] bg-[#dcd9ce] overflow-hidden mb-2.5">
                <img
                  src={
                    inspectingRoom.gallery[inspectGalleryIdx] ||
                    inspectingRoom.featuredImage
                  }
                  alt={inspectingRoom.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {inspectingRoom.gallery.length > 1 && (
                <div className="flex gap-2.5">
                  {inspectingRoom.gallery.map((imgUrl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setInspectGalleryIdx(i)}
                      className={`w-24 h-16 overflow-hidden border-2 ${
                        i === inspectGalleryIdx ? 'border-[#23302a]' : 'border-transparent opacity-70'
                      }`}
                    >
                      <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-b border-[#d4d0c7] py-6 mb-6">
              <div>
                <h4 className="text-[10px] tracking-[0.18em] uppercase font-bold text-[#b27356] mb-3">
                  Space &amp; Amenities
                </h4>
                <div className="text-xs text-[#5d655b] space-y-1.5 mb-4">
                  <div>
                    <strong>Dimensions:</strong> {inspectingRoom.roomSize}
                  </div>
                  <div>
                    <strong>Sleeping:</strong> {inspectingRoom.bedTypes}
                  </div>
                  <div>
                    <strong>Occupancy:</strong> Up to {inspectingRoom.maxGuests} guests
                  </div>
                </div>
                <ul className="text-xs text-[#23302a] space-y-1.5 list-disc pl-4">
                  {inspectingRoom.amenities.map((am, i) => (
                    <li key={i}>{am}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-[10px] tracking-[0.18em] uppercase font-bold text-[#b27356] mb-3">
                  Live Availability &amp; Stay Calculator
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="field">
                    <label>Check in</label>
                    <input
                      type="date"
                      min={today}
                      value={checkIn}
                      onChange={(e) => handleCheckInChange(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Check out</label>
                    <input
                      type="date"
                      min={addDaysISO(checkIn, 1)}
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                    />
                  </div>
                </div>

                {(() => {
                  const roomAvail = availabilityReport.results.find(
                    (r) => r.roomType.id === inspectingRoom.id
                  );
                  if (!roomAvail) return null;
                  return (
                    <div className="bg-[#eae6dd] p-4 border-l-2 border-[#243c35] text-xs space-y-1.5">
                      <div className="flex justify-between font-bold">
                        <span>
                          {roomAvail.pricing.nights} night(s) · {totalGuests} guest(s)
                        </span>
                        <span>
                          {formatMoneyExact(
                            roomAvail.pricing.subtotalCents,
                            settings.currencySymbol
                          )}{' '}
                          + taxes
                        </span>
                      </div>
                      <div className="text-[#5d655b]">
                        Status:{' '}
                        {roomAvail.isAvailable ? (
                          <strong className="text-[#2f6253]">
                            Available ({roomAvail.availableUnits} of {roomAvail.activePhysicalUnits}{' '}
                            units free)
                          </strong>
                        ) : (
                          <strong className="text-[#8d453d]">
                            {roomAvail.unavailabilityReason}
                          </strong>
                        )}
                      </div>
                      <div className="pt-2 border-t border-[#d4d0c7] text-[11px] text-[#74796f]">
                        {inspectingRoom.rules.join(' · ')}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <button
              type="button"
              className="modal-submit"
              onClick={() => openBookingEngine(inspectingRoom.id)}
            >
              <span>Proceed to Book {inspectingRoom.name}</span>
              <svg>
                <use href="#i-arrow" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* COMPLETE MULTI-STEP HOTEL BOOKING ENGINE MODAL */}
      <div
        className={`modal-wrap ${isBookingModalOpen ? 'open' : ''}`}
        id="bookingModal"
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeBookingModal();
        }}
      >
        <div
          className="book-modal wide"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modalTitle"
        >
          <button
            className="modal-close"
            id="closeModal"
            type="button"
            aria-label="Close booking dialog"
            onClick={closeBookingModal}
          >
            <svg>
              <use href="#i-close" />
            </svg>
          </button>

          <span className="eyebrow">
            {bookingStep === 'availability' && 'Step 01 / 03 — Select Dates & Accommodation'}
            {bookingStep === 'guest_details' && 'Step 02 / 03 — Guest Details & Price Breakdown'}
            {bookingStep === 'confirmed' && 'Step 03 / 03 — Confirmed Coastal Reservation'}
          </span>

          {bookingStep === 'availability' && (
            <>
              <h2 id="modalTitle">
                Let’s make
                <br />
                <em>space for you.</em>
              </h2>
              <p>
                Select your dates and guest count below to check real-time physical room inventory in Ahangama.
              </p>

              <div className="modal-fields mb-6">
                <div className="field">
                  <label htmlFor="modalArrival">Check in</label>
                  <input
                    type="date"
                    id="modalArrival"
                    min={today}
                    value={checkIn}
                    onChange={(e) => handleCheckInChange(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="modalDeparture">Check out</label>
                  <input
                    type="date"
                    id="modalDeparture"
                    min={addDaysISO(checkIn || today, 1)}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="modalAdults">Adults</label>
                  <select
                    id="modalAdults"
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n} adult{n > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="modalChildren">Children</label>
                  <select
                    id="modalChildren"
                    value={children}
                    onChange={(e) => setChildren(Number(e.target.value))}
                  >
                    {[0, 1, 2].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'child' : 'children'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!availabilityReport.validRequest ? (
                <div className="modal-note error">{availabilityReport.validationError}</div>
              ) : (
                <div className="space-y-4">
                  <div className="text-[10px] tracking-[0.18em] uppercase font-bold text-[#74796f]">
                    Accommodation Availability ({diffNightsISO(checkIn, checkOut)} night
                    {diffNightsISO(checkIn, checkOut) === 1 ? '' : 's'} · {totalGuests} guest
                    {totalGuests === 1 ? '' : 's'})
                  </div>

                  {availabilityReport.results.map((item) => {
                    const { roomType, isAvailable, availableUnits, activePhysicalUnits, pricing } =
                      item;
                    const isHighlighted =
                      selectedRoomId === roomType.id || selectedRoomId === roomType.name;
                    return (
                      <div
                        key={roomType.id}
                        className={`p-5 border transition flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between ${
                          isHighlighted
                            ? 'border-[#23302a] bg-[#fffaf2]'
                            : 'border-[#d4d0c7] bg-[#fffdf9]'
                        }`}
                      >
                        <div className="flex gap-4 items-center">
                          <img
                            src={roomType.featuredImage}
                            alt={roomType.name}
                            className="w-24 h-20 object-cover shrink-0 bg-[#dcd9ce]"
                          />
                          <div>
                            <div className="text-[10px] tracking-[0.16em] uppercase text-[#b27356] font-bold">
                              {roomType.category} · Max {roomType.maxGuests} guests
                            </div>
                            <h3 className="font-serif text-2xl mt-0.5">{roomType.name}</h3>
                            <div className="text-xs text-[#5d655b] mt-1">
                              {isAvailable ? (
                                <span className="text-[#2f6253] font-semibold">
                                  ✓ {availableUnits} of {activePhysicalUnits} physical units available
                                </span>
                              ) : (
                                <span className="text-[#8d453d] font-semibold">
                                  ✕ {item.unavailabilityReason}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="w-full sm:w-auto text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-[#eae6dd]">
                          <div className="text-xs text-[#74796f]">
                            {formatCurrencyCents(
                              pricing.averageNightlyCents,
                              settings.currencySymbol
                            )}{' '}
                            / night
                          </div>
                          <div className="font-serif text-2xl font-medium">
                            {formatMoneyExact(pricing.totalCents, settings.currencySymbol)}{' '}
                            <span className="text-[10px] font-sans uppercase tracking-wider text-[#74796f]">
                              incl. taxes
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => proceedToGuestDetails(roomType.id)}
                            className="mt-2 bg-[#243c35] text-[#fffaf2] px-5 py-2.5 text-[10px] tracking-[0.16em] uppercase font-bold disabled:opacity-40"
                          >
                            {isAvailable ? 'Select & Hold Room →' : 'Unavailable'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {bookingError && <div className="modal-note error">{bookingError}</div>}
            </>
          )}

          {bookingStep === 'guest_details' && selectedRoomAvailability && (
            <form onSubmit={handleFinalizeBooking}>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 mb-4">
                <h2 className="font-serif text-4xl m-0">
                  Complete your <em>reservation.</em>
                </h2>
                <button
                  type="button"
                  onClick={() => setBookingStep('availability')}
                  className="text-[10px] tracking-[0.16em] uppercase font-bold underline"
                >
                  ← Change Room or Dates
                </button>
              </div>

              {activeHold && (
                <div className="bg-[#eae6dd] px-4 py-2.5 text-xs mb-5 flex justify-between items-center border-l-2 border-[#243c35]">
                  <span>
                    Inventory hold active for <strong>{selectedRoomAvailability.roomType.name}</strong>{' '}
                    ({checkIn} → {checkOut})
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#2f6253]">
                    1 Unit Reserved for Checkout
                  </span>
                </div>
              )}

              <div className="modal-fields">
                <div className="field">
                  <label htmlFor="modalName">Full Name *</label>
                  <input
                    id="modalName"
                    type="text"
                    placeholder="Your full name"
                    value={guestFullName}
                    onChange={(e) => setGuestFullName(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="field">
                  <label htmlFor="modalEmail">Email Address *</label>
                  <input
                    id="modalEmail"
                    type="email"
                    placeholder="you@example.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    required
                    maxLength={200}
                  />
                </div>
                <div className="field">
                  <label htmlFor="modalPhone">Contact Number (with country code) *</label>
                  <input
                    id="modalPhone"
                    type="tel"
                    placeholder="+94 77 123 4567"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="modalCountry">Country of Residence *</label>
                  <input
                    id="modalCountry"
                    type="text"
                    placeholder="e.g. United Kingdom, Sri Lanka, Germany"
                    value={guestCountry}
                    onChange={(e) => setGuestCountry(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="modalPromo">Privileged / Seasonal Code (Optional)</label>
                  <input
                    id="modalPromo"
                    type="text"
                    placeholder="Try SLOWSTAY10 for 10% off"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="modalPaymentMethod">Booking &amp; Payment Method</label>
                  <select
                    id="modalPaymentMethod"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  >
                    <option value="pay_at_hotel" disabled={!settings.payAtHotelEnabled}>
                      Pay at Hotel / Direct Bank Settlement on Arrival
                    </option>
                    <option value="online_deposit" disabled={!settings.onlinePaymentConfigured}>
                      Pay {settings.depositPercent}% Reservation Deposit Online{' '}
                      {!settings.onlinePaymentConfigured ? '(Gateway Unconfigured)' : ''}
                    </option>
                    <option value="online_full" disabled={!settings.onlinePaymentConfigured}>
                      Pay Full Advance Online{' '}
                      {!settings.onlinePaymentConfigured ? '(Gateway Unconfigured)' : ''}
                    </option>
                  </select>
                </div>
                <div className="field full">
                  <label htmlFor="modalRequests">
                    Special Requests &amp; Arrival Notes (Optional)
                  </label>
                  <textarea
                    id="modalRequests"
                    placeholder="Airport transfer from Colombo, dietary preferences, or estimated arrival time..."
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                  />
                </div>
              </div>

              {/* Transparent Server-Equivalent Price Breakdown */}
              <div className="mt-6 bg-[#fffdf9] border border-[#d4d0c7] p-5 text-xs space-y-2">
                <div className="text-[10px] tracking-[0.18em] uppercase font-bold text-[#b27356] mb-2">
                  Transparent Stay Breakdown — {selectedRoomAvailability.roomType.name}
                </div>
                <div className="flex justify-between">
                  <span>
                    {selectedRoomAvailability.pricing.nights} night(s) ×{' '}
                    {formatMoneyExact(
                      selectedRoomAvailability.pricing.averageNightlyCents,
                      settings.currencySymbol
                    )}{' '}
                    avg/night
                  </span>
                  <span>
                    {formatMoneyExact(
                      selectedRoomAvailability.pricing.subtotalCents,
                      settings.currencySymbol
                    )}
                  </span>
                </div>
                {selectedRoomAvailability.pricing.discountCents > 0 && (
                  <div className="flex justify-between text-[#2f6253] font-semibold">
                    <span>
                      Privilege Code ({selectedRoomAvailability.pricing.discountCode})
                    </span>
                    <span>
                      -
                      {formatMoneyExact(
                        selectedRoomAvailability.pricing.discountCents,
                        settings.currencySymbol
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-[#5d655b]">
                  <span>Tourism &amp; Value Added Tax ({settings.taxRatePercent}%)</span>
                  <span>
                    {formatMoneyExact(
                      selectedRoomAvailability.pricing.taxCents,
                      settings.currencySymbol
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-[#5d655b]">
                  <span>House Service Charge ({settings.serviceChargePercent}%)</span>
                  <span>
                    {formatMoneyExact(
                      selectedRoomAvailability.pricing.serviceChargeCents,
                      settings.currencySymbol
                    )}
                  </span>
                </div>
                <div className="border-t border-[#d4d0c7] pt-2.5 flex justify-between text-sm font-bold">
                  <span>Total Stay Cost ({settings.currency})</span>
                  <span>
                    {formatMoneyExact(
                      selectedRoomAvailability.pricing.totalCents,
                      settings.currencySymbol
                    )}
                  </span>
                </div>
                <div className="text-[11px] text-[#74796f] pt-1">
                  <strong>Cancellation Policy:</strong> {settings.cancellationPolicy}
                </div>
              </div>

              {bookingError && <div className="modal-note error">{bookingError}</div>}

              <button className="modal-submit" type="submit">
                <span>Confirm Reservation &amp; Generate Reference</span>
                <svg>
                  <use href="#i-arrow" />
                </svg>
              </button>
            </form>
          )}

          {bookingStep === 'confirmed' && confirmedBooking && (
            <div className="space-y-6 mt-4">
              <div className="modal-note success">
                <strong>Reservation Confirmed — Reference: {confirmedBooking.reference}</strong>
                <br />
                Your room unit (<strong>{confirmedBooking.roomUnitNumber}</strong>) has been locked in our house inventory.
              </div>

              <div className="bg-[#fffdf9] border border-[#d4d0c7] p-6 space-y-3 text-xs">
                <div className="flex flex-wrap justify-between items-center border-b border-[#eae6dd] pb-3">
                  <div>
                    <div className="text-[10px] tracking-[0.18em] uppercase text-[#74796f]">
                      Booking Reference
                    </div>
                    <div className="font-mono text-xl font-bold mt-0.5">
                      {confirmedBooking.reference}
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-[#e2ebe6] text-[#2f6253] font-bold uppercase text-[10px] tracking-widest">
                    {confirmedBooking.status} · {confirmedBooking.paymentStatus}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <strong>Guest:</strong> {confirmedBooking.guest.fullName} (
                    {confirmedBooking.guest.country})
                  </div>
                  <div>
                    <strong>Contact:</strong> {confirmedBooking.guest.email} ·{' '}
                    {confirmedBooking.guest.phone}
                  </div>
                  <div>
                    <strong>Accommodation:</strong> {confirmedBooking.roomName} (Unit{' '}
                    {confirmedBooking.roomUnitNumber})
                  </div>
                  <div>
                    <strong>Party:</strong> {confirmedBooking.totalGuests} guest(s) (
                    {confirmedBooking.adults} adults, {confirmedBooking.children} children)
                  </div>
                  <div>
                    <strong>Check-in:</strong> {confirmedBooking.checkIn} (from{' '}
                    {settings.checkInTime})
                  </div>
                  <div>
                    <strong>Check-out:</strong> {confirmedBooking.checkOut} (by{' '}
                    {settings.checkOutTime})
                  </div>
                </div>

                <div className="border-t border-[#eae6dd] pt-3 flex justify-between items-center text-sm font-bold">
                  <span>Total Amount ({confirmedBooking.nights} nights)</span>
                  <span>
                    {formatMoneyExact(
                      confirmedBooking.pricing.totalCents,
                      settings.currencySymbol
                    )}{' '}
                    {settings.currency}
                  </span>
                </div>
              </div>

              {confirmedEmail && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowEmailPreview((v) => !v)}
                    className="text-[10px] tracking-[0.17em] uppercase font-bold underline"
                  >
                    {showEmailPreview
                      ? 'Hide Confirmation Email Preview'
                      : 'View Confirmation Email Dispatched to Guest'}
                  </button>
                  {showEmailPreview && (
                    <div
                      className="mt-3 max-h-80 overflow-y-auto border border-[#d4d0c7]"
                      dangerouslySetInnerHTML={{ __html: confirmedEmail.htmlBody }}
                    />
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="border border-[#23302a] px-5 py-3 text-[10px] tracking-[0.16em] uppercase font-bold"
                >
                  Print Confirmation
                </button>
                <button
                  type="button"
                  onClick={closeBookingModal}
                  className="bg-[#243c35] text-white px-6 py-3 text-[10px] tracking-[0.16em] uppercase font-bold"
                >
                  Done &amp; Return to Salt &amp; Stone
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* EXPERIENCE DETAIL MODAL */}
      {inspectingExperience && (
        <div
          className="modal-wrap open"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectingExperience(null);
          }}
        >
          <div className="book-modal" role="dialog" aria-modal="true">
            <button
              className="modal-close"
              type="button"
              aria-label="Close experience dialog"
              onClick={() => setInspectingExperience(null)}
            >
              <svg>
                <use href="#i-close" />
              </svg>
            </button>
            <span className="eyebrow">{inspectingExperience.numberLabel}</span>
            <h2>{inspectingExperience.title}</h2>
            <div className="aspect-[16/9] overflow-hidden bg-[#dcd9ce] my-5">
              <img
                src={inspectingExperience.image}
                alt={inspectingExperience.alt}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-sm text-[#23302a] leading-relaxed">
              {inspectingExperience.fullDescription}
            </p>
            <div className="bg-[#eae6dd] p-4 text-xs space-y-1.5 mb-5">
              <div>
                <strong>Rhythm &amp; Timing:</strong> {inspectingExperience.duration}
              </div>
              <div>
                <strong>House Note:</strong> {inspectingExperience.includedText}
              </div>
            </div>
            <button
              type="button"
              className="modal-submit"
              onClick={() => {
                setInspectingExperience(null);
                openBookingEngine();
              }}
            >
              <span>Plan your stay with us</span>
              <svg>
                <use href="#i-arrow" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* DINING ENQUIRY & SAMPLE MENU MODAL */}
      {isDiningModalOpen && (
        <div
          className="modal-wrap open"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDiningModalOpen(false);
          }}
        >
          <div className="book-modal" role="dialog" aria-modal="true">
            <button
              className="modal-close"
              type="button"
              aria-label="Close dining dialog"
              onClick={() => setIsDiningModalOpen(false)}
            >
              <svg>
                <use href="#i-close" />
              </svg>
            </button>
            <span className="eyebrow">04 &nbsp; / &nbsp; At Our Table</span>
            <h2>
              Seasonal Harvest &amp; <em>Table Enquiry</em>
            </h2>
            <p>
              Our kitchen cooks exclusively with the morning’s coastal catch and produce from our neighbouring organic estate.
            </p>

            <div className="space-y-3 border-t border-b border-[#d4d0c7] py-4 mb-6">
              {content.dining.sampleMenu.map((item, i) => (
                <div key={i} className="text-xs">
                  <span className="text-[10px] tracking-[0.16em] uppercase text-[#b27356] font-bold">
                    {item.course}
                  </span>
                  <div className="font-serif text-lg">{item.dish}</div>
                  <div className="text-[#74796f]">{item.note}</div>
                </div>
              ))}
            </div>

            {diningSubmitted ? (
              <div className="modal-note success">
                Thank you, {diningName}. Our kitchen and house host have received your table enquiry for {diningDate}.
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createDiningEnquiry({
                    name: diningName,
                    email: diningEmail,
                    date: diningDate,
                    guests: diningGuests,
                    dietaryNotes: diningNotes,
                  });
                  setDiningSubmitted(true);
                }}
              >
                <div className="modal-fields">
                  <div className="field">
                    <label>Your Name *</label>
                    <input
                      type="text"
                      required
                      value={diningName}
                      onChange={(e) => setDiningName(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      required
                      value={diningEmail}
                      onChange={(e) => setDiningEmail(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Preferred Date *</label>
                    <input
                      type="date"
                      min={today}
                      required
                      value={diningDate}
                      onChange={(e) => setDiningDate(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Guests</label>
                    <select
                      value={diningGuests}
                      onChange={(e) => setDiningGuests(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5, 6, 8].map((n) => (
                        <option key={n} value={n}>
                          {n} guest{n > 1 ? 's' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field full">
                    <label>Dietary Notes or Occasion</label>
                    <input
                      type="text"
                      placeholder="Allergies, wine pairings, sunset table preference..."
                      value={diningNotes}
                      onChange={(e) => setDiningNotes(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className="modal-submit">
                  <span>Request Table at Salt &amp; Stone</span>
                  <svg>
                    <use href="#i-arrow" />
                  </svg>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* BOOKING LOOKUP / MANAGE MODAL */}
      {isLookupModalOpen && (
        <div
          className="modal-wrap open"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsLookupModalOpen(false);
          }}
        >
          <div className="book-modal" role="dialog" aria-modal="true">
            <button
              className="modal-close"
              type="button"
              aria-label="Close lookup dialog"
              onClick={() => setIsLookupModalOpen(false)}
            >
              <svg>
                <use href="#i-close" />
              </svg>
            </button>
            <span className="eyebrow">Guest Reservation Retrieval</span>
            <h2>
              Manage your <em>stay.</em>
            </h2>
            <p>
              Enter your booking reference (for example, <code>SS-2026-000121</code>) to view your confirmed reservation or modify status.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setLookupError(null);
                const found = findBookingByReference(lookupRef);
                if (!found) {
                  setLookupResult(null);
                  setLookupError('No reservation found matching that reference.');
                } else {
                  setLookupResult(found);
                }
              }}
              className="flex gap-3"
            >
              <input
                type="text"
                placeholder="SS-2026-000121"
                value={lookupRef}
                onChange={(e) => setLookupRef(e.target.value)}
                className="flex-1 h-12 px-3.5 bg-white border border-[#d4d0c7]"
                required
              />
              <button
                type="submit"
                className="bg-[#243c35] text-white px-6 text-[10px] tracking-[0.16em] uppercase font-bold"
              >
                Find Booking
              </button>
            </form>

            {lookupError && <div className="modal-note error">{lookupError}</div>}

            {lookupResult && (
              <div className="mt-6 bg-[#fffdf9] border border-[#d4d0c7] p-5 text-xs space-y-2.5">
                <div className="flex justify-between items-center border-b border-[#eae6dd] pb-2">
                  <span className="font-mono font-bold text-base">{lookupResult.reference}</span>
                  <span className="uppercase text-[10px] tracking-widest font-bold px-2.5 py-1 bg-[#eae6dd]">
                    {lookupResult.status}
                  </span>
                </div>
                <div>
                  <strong>Guest:</strong> {lookupResult.guest.fullName} ({lookupResult.guest.email})
                </div>
                <div>
                  <strong>Room:</strong> {lookupResult.roomName} · Unit{' '}
                  {lookupResult.roomUnitNumber}
                </div>
                <div>
                  <strong>Dates:</strong> {lookupResult.checkIn} → {lookupResult.checkOut} (
                  {lookupResult.nights} nights)
                </div>
                <div>
                  <strong>Total:</strong>{' '}
                  {formatMoneyExact(lookupResult.pricing.totalCents, settings.currencySymbol)} (
                  {lookupResult.paymentStatus})
                </div>

                {lookupResult.status !== 'Cancelled' && (
                  <div className="pt-3 border-t border-[#eae6dd] flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = updateBookingStatus(lookupResult.id, 'Cancelled');
                        if (updated) setLookupResult(updated);
                      }}
                      className="border border-[#8d453d] text-[#8d453d] px-3.5 py-2 text-[10px] tracking-wider uppercase font-bold hover:bg-[#8d453d] hover:text-white"
                    >
                      Cancel Reservation &amp; Release Room
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FULL-SCREEN LIGHTBOX GALLERY VIEWER */}
      {lightboxIdx !== null && content.moments.gallery[lightboxIdx] && (
        <div
          className="fixed inset-0 z-[140] bg-[#172c27]/95 text-[#f5f2eb] flex flex-col justify-between p-6 md:p-12"
          role="dialog"
          aria-modal="true"
          aria-label="Full screen image gallery"
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] tracking-[0.2em] uppercase">
              Postcard 0{lightboxIdx + 1} / 0{content.moments.gallery.length}
            </span>
            <button
              type="button"
              onClick={() => setLightboxIdx(null)}
              className="menu-close"
              aria-label="Close gallery viewer"
            >
              <span>Close</span>
              <svg className="w-6 h-6">
                <use href="#i-close" />
              </svg>
            </button>
          </div>

          <div className="max-w-4xl w-full mx-auto my-auto py-6">
            <div className="aspect-[16/10] bg-black/30 overflow-hidden">
              <img
                src={content.moments.gallery[lightboxIdx].url}
                alt={content.moments.gallery[lightboxIdx].alt}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-center font-serif italic text-xl mt-4 text-[#e2cfb9]">
              {content.moments.gallery[lightboxIdx].caption}
            </p>
          </div>

          <div className="flex justify-center gap-4">
            <button
              type="button"
              aria-label="Previous photograph"
              onClick={() =>
                setLightboxIdx(
                  (lightboxIdx - 1 + content.moments.gallery.length) %
                    content.moments.gallery.length
                )
              }
              className="circle-btn !border-white/40 !text-white"
            >
              <svg>
                <use href="#i-arrow-left" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next photograph"
              onClick={() =>
                setLightboxIdx((lightboxIdx + 1) % content.moments.gallery.length)
              }
              className="circle-btn !border-white/40 !text-white"
            >
              <svg>
                <use href="#i-arrow" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
