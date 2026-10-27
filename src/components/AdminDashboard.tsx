import React, { useMemo, useState } from 'react';
import {
  BookingRecord,
  BookingStatus,
  HotelDatabaseState,
  PaymentStatus,
  RoomType,
} from '../types/hotel';
import {
  addRoomBlock,
  addRoomUnit,
  addSeasonalRate,
  datesOverlap,
  formatMoneyExact,
  getHotelTodayISO,
  markAllNotificationsRead,
  removeRoomBlock,
  removeSeasonalRate,
  resetDemoDatabase,
  saveRoomType,
  toggleRoomUnitMaintenance,
  updateBookingDetails,
  updateBookingStatus,
  updateHotelSettings,
  updateWebsiteContent,
} from '../services/hotelStore';

interface AdminDashboardProps {
  db: HotelDatabaseState;
  onNavigatePublic: (path?: string) => void;
}

const ADMIN_SESSION_KEY = 'salt_and_stone_admin_auth_v1';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ db, onNavigatePublic }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'authenticated';
    } catch {
      return false;
    }
  });

  const [loginEmail, setLoginEmail] = useState('admin@saltandstone.lk');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState<
    'overview' | 'reservations' | 'rooms' | 'inventory' | 'cms' | 'communications' | 'settings'
  >('overview');

  // Reservations filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [editingBooking, setEditingBooking] = useState<BookingRecord | null>(null);

  // Room editor state
  const [editingRoom, setEditingRoom] = useState<RoomType | null>(null);
  const [newUnitRoomId, setNewUnitRoomId] = useState(db.roomTypes[0]?.id || 'room-garden');
  const [newUnitNumber, setNewUnitNumber] = useState('');
  const [newUnitFloor, setNewUnitFloor] = useState('Ground Garden');

  // Block & seasonal rate form state
  const [blockRoomTypeId, setBlockRoomTypeId] = useState(db.roomTypes[0]?.id || 'room-garden');
  const [blockStart, setBlockStart] = useState(getHotelTodayISO());
  const [blockEnd, setBlockEnd] = useState(getHotelTodayISO());
  const [blockReason, setBlockReason] = useState('Scheduled coastal timber maintenance');

  const [rateRoomTypeId, setRateRoomTypeId] = useState(db.roomTypes[0]?.id || 'room-garden');
  const [rateLabel, setRateLabel] = useState('High Season Rate');
  const [rateStart, setRateStart] = useState(getHotelTodayISO());
  const [rateEnd, setRateEnd] = useState(getHotelTodayISO());
  const [ratePriceDollars, setRatePriceDollars] = useState('260');
  const [rateMinStay, setRateMinStay] = useState('2');

  // CMS & Settings draft states
  const [cmsDraft, setCmsDraft] = useState(db.content);
  const [settingsDraft, setSettingsDraft] = useState(db.settings);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [previewEmailHtml, setPreviewEmailHtml] = useState<string | null>(null);

  const today = getHotelTodayISO();
  const tomorrow = useMemo(() => {
    const [y, m, d] = today.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + 1));
    return dt.toISOString().slice(0, 10);
  }, [today]);

  const metrics = useMemo(() => {
    const activeBookings = db.bookings.filter(
      (b) => b.status !== 'Cancelled' && b.status !== 'Expired'
    );
    const arrivalsToday = activeBookings.filter((b) => b.checkIn === today);
    const departuresToday = activeBookings.filter((b) => b.checkOut === today);
    const occupiedToday = activeBookings.filter((b) =>
      datesOverlap(b.checkIn, b.checkOut, today, tomorrow)
    );

    const activeUnitsCount = db.roomUnits.filter((u) => u.maintenanceStatus === 'active').length;
    const occupancyPct =
      activeUnitsCount > 0 ? Math.min(100, Math.round((occupiedToday.length / activeUnitsCount) * 100)) : 0;

    const confirmedRevenueCents = activeBookings
      .filter((b) => b.status === 'Confirmed' || b.status === 'Completed')
      .reduce((acc, b) => acc + b.pricing.totalCents, 0);

    const pendingPaymentsBookings = activeBookings.filter(
      (b) => b.paymentStatus === 'Unpaid' || b.status === 'Awaiting payment'
    );
    const pendingAmountCents = pendingPaymentsBookings.reduce(
      (acc, b) => acc + b.pricing.totalCents,
      0
    );

    const unreadNotifications = db.notifications.filter((n) => !n.read).length;

    return {
      totalReservations: db.bookings.length,
      arrivalsToday,
      departuresToday,
      occupiedToday,
      activeUnitsCount,
      occupancyPct,
      confirmedRevenueCents,
      pendingPaymentsCount: pendingPaymentsBookings.length,
      pendingAmountCents,
      unreadNotifications,
    };
  }, [db, today, tomorrow]);

  const filteredBookings = useMemo(() => {
    return db.bookings.filter((b) => {
      if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        b.reference.toLowerCase().includes(q) ||
        b.guest.fullName.toLowerCase().includes(q) ||
        b.guest.email.toLowerCase().includes(q) ||
        b.roomName.toLowerCase().includes(q) ||
        b.checkIn.includes(q) ||
        b.checkOut.includes(q)
      );
    });
  }, [db.bookings, searchQuery, statusFilter]);

  const showToast = (msg: string) => {
    setSaveBanner(msg);
    setTimeout(() => setSaveBanner(null), 3500);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      loginEmail.trim().toLowerCase() === 'admin@saltandstone.lk' &&
      (loginPass === 'saltandstone2026' || loginPass === 'admin123')
    ) {
      try {
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'authenticated');
      } catch {
        // ignore
      }
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Invalid credentials. Use admin@saltandstone.lk / saltandstone2026');
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
  };

  const handleExportCsv = () => {
    const headers = [
      'Reference',
      'Status',
      'Payment Status',
      'Room',
      'Unit',
      'Guest Name',
      'Email',
      'Phone',
      'Country',
      'Check-In',
      'Check-Out',
      'Nights',
      'Guests',
      'Total (USD)',
    ];
    const rows = filteredBookings.map((b) => [
      b.reference,
      b.status,
      b.paymentStatus,
      `"${b.roomName}"`,
      b.roomUnitNumber,
      `"${b.guest.fullName}"`,
      b.guest.email,
      `"${b.guest.phone}"`,
      `"${b.guest.country}"`,
      b.checkIn,
      b.checkOut,
      b.nights,
      b.totalGuests,
      (b.pricing.totalCents / 100).toFixed(2),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `salt-and-stone-reservations-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#172c27] text-[#f5f2eb] flex flex-col justify-between p-6 md:p-14">
        <header className="flex items-center justify-between border-b border-white/15 pb-6">
          <button
            type="button"
            onClick={() => onNavigatePublic('/')}
            className="font-serif text-2xl tracking-tight text-left"
          >
            salt <i>&amp;</i> stone{' '}
            <span className="block font-sans text-[9px] tracking-[0.3em] uppercase text-[#c2ad93] mt-1">
              coastal house · administration
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNavigatePublic('/')}
            className="text-[10px] tracking-[0.18em] uppercase font-bold border border-white/30 px-4 py-2.5 hover:bg-[#f5f2eb] hover:text-[#23302a] transition"
          >
            ← Return to Public Website
          </button>
        </header>

        <div className="max-w-md w-full mx-auto bg-[#f5f2eb] text-[#23302a] p-8 md:p-11 shadow-2xl border border-[#d4d0c7]">
          <span className="eyebrow">Hospitality Operations</span>
          <h1 className="font-serif text-4xl mt-3 mb-2 tracking-tight">House Administration</h1>
          <p className="text-xs text-[#72786f] leading-relaxed mb-6">
            Sign in to manage room inventory, reservations, seasonal rates, and editorial content.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="field">
              <label htmlFor="adminEmail">Administrator Email</label>
              <input
                id="adminEmail"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="adminPassword">Password</label>
              <input
                id="adminPassword"
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="Enter admin password"
                required
              />
            </div>

            {loginError && <div className="modal-note error">{loginError}</div>}

            <button type="submit" className="modal-submit">
              <span>Enter Admin Portal</span>
              <span>→</span>
            </button>

            <div className="pt-3 border-t border-[#d4d0c7] flex items-center justify-between text-[11px] text-[#74796f]">
              <span>Demo Admin Access:</span>
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('admin@saltandstone.lk');
                  setLoginPass('saltandstone2026');
                }}
                className="underline font-semibold text-[#23302a]"
              >
                Auto-fill Credentials
              </button>
            </div>
          </form>
        </div>

        <footer className="text-[10px] tracking-[0.15em] uppercase text-[#a7b3aa] flex justify-between border-t border-white/15 pt-5">
          <span>Salt &amp; Stone — Internal Property Management System</span>
          <span>Ahangama · Sri Lanka ({db.settings.timezone})</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f2eb] text-[#23302a] flex flex-col">
      {/* Top Admin Header */}
      <header className="bg-[#172c27] text-[#f5f2eb] px-6 lg:px-12 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-white/15 sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => onNavigatePublic('/')}
            className="font-serif text-2xl tracking-tight text-left"
          >
            salt <i>&amp;</i> stone
          </button>
          <span className="text-[10px] tracking-[0.22em] uppercase px-3 py-1 bg-[#243c35] text-[#e2cfb9] font-bold">
            Admin Console · {today}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onNavigatePublic('/')}
            className="text-[10px] tracking-[0.16em] uppercase font-bold border border-white/30 px-4 py-2 hover:bg-[#f5f2eb] hover:text-[#23302a] transition"
          >
            View Live Website ↗
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="text-[10px] tracking-[0.16em] uppercase font-bold text-[#e2cfb9] hover:underline px-2 py-2"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-[#eae6dd] border-b border-[#d4d0c7] px-6 lg:px-12 flex overflow-x-auto gap-1">
        {[
          { id: 'overview', label: '01 / Overview' },
          { id: 'reservations', label: `02 / Reservations (${db.bookings.length})` },
          { id: 'rooms', label: `03 / Rooms (${db.roomTypes.length})` },
          { id: 'inventory', label: '04 / Units, Blocks & Rates' },
          { id: 'cms', label: '05 / Website Content (CMS)' },
          {
            id: 'communications',
            label: `06 / Emails & Enquiries (${db.emails.length + db.diningEnquiries.length})`,
          },
          { id: 'settings', label: '07 / Payment & Hotel Settings' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-5 py-4 text-[10px] tracking-[0.18em] uppercase font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === tab.id
                ? 'border-[#23302a] text-[#23302a] bg-[#f5f2eb]'
                : 'border-transparent text-[#74796f] hover:text-[#23302a]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {saveBanner && (
        <div className="bg-[#243c35] text-[#fffaf2] px-6 lg:px-12 py-3 text-xs tracking-wide flex justify-between items-center">
          <span>✓ {saveBanner}</span>
          <button type="button" onClick={() => setSaveBanner(null)} className="text-[10px] uppercase">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-12 max-w-[1440px] w-full mx-auto">
        {activeTab === 'overview' && (
          <div className="space-y-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="eyebrow">Property Pulse</span>
                <h1 className="font-serif text-4xl md:text-5xl mt-2">Daily Operations Overview</h1>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('reservations')}
                  className="bg-[#243c35] text-[#fffaf2] px-5 py-3 text-[10px] tracking-[0.17em] uppercase font-bold"
                >
                  Manage Reservations →
                </button>
              </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-[#fffaf2] border border-[#d4d0c7] p-6">
                <div className="text-[10px] tracking-[0.18em] uppercase text-[#74796f] font-bold">
                  Occupancy Today ({today})
                </div>
                <div className="font-serif text-4xl mt-3">
                  {metrics.occupancyPct}%
                </div>
                <div className="text-xs text-[#74796f] mt-2">
                  {metrics.occupiedToday.length} of {metrics.activeUnitsCount} active physical units occupied
                </div>
              </div>

              <div className="bg-[#fffaf2] border border-[#d4d0c7] p-6">
                <div className="text-[10px] tracking-[0.18em] uppercase text-[#74796f] font-bold">
                  Today’s Movements
                </div>
                <div className="font-serif text-4xl mt-3">
                  {metrics.arrivalsToday.length} In &nbsp;/&nbsp; {metrics.departuresToday.length} Out
                </div>
                <div className="text-xs text-[#74796f] mt-2">
                  Check-in {db.settings.checkInTime} · Check-out {db.settings.checkOutTime}
                </div>
              </div>

              <div className="bg-[#fffaf2] border border-[#d4d0c7] p-6">
                <div className="text-[10px] tracking-[0.18em] uppercase text-[#74796f] font-bold">
                  Confirmed Revenue
                </div>
                <div className="font-serif text-4xl mt-3">
                  {formatMoneyExact(metrics.confirmedRevenueCents, db.settings.currencySymbol)}
                </div>
                <div className="text-xs text-[#74796f] mt-2">
                  Across {metrics.totalReservations} total reservation records
                </div>
              </div>

              <div className="bg-[#fffaf2] border border-[#d4d0c7] p-6">
                <div className="text-[10px] tracking-[0.18em] uppercase text-[#b27356] font-bold">
                  Pending Settlement
                </div>
                <div className="font-serif text-4xl mt-3">
                  {formatMoneyExact(metrics.pendingAmountCents, db.settings.currencySymbol)}
                </div>
                <div className="text-xs text-[#74796f] mt-2">
                  {metrics.pendingPaymentsCount} reservation(s) awaiting hotel or online payment
                </div>
              </div>
            </div>

            {/* Notifications & Recent Bookings */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-[#fffaf2] border border-[#d4d0c7] p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-serif text-2xl">Recent Reservations</h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('reservations')}
                    className="text-[10px] tracking-[0.16em] uppercase font-bold underline"
                  >
                    View All
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#d4d0c7] text-[10px] tracking-[0.15em] uppercase text-[#74796f]">
                        <th className="py-3 pr-3">Reference</th>
                        <th className="py-3 pr-3">Guest</th>
                        <th className="py-3 pr-3">Room / Unit</th>
                        <th className="py-3 pr-3">Dates</th>
                        <th className="py-3 pr-3">Total</th>
                        <th className="py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {db.bookings.slice(0, 6).map((b) => (
                        <tr key={b.id} className="border-b border-[#eae6dd]">
                          <td className="py-3.5 pr-3 font-mono font-semibold">{b.reference}</td>
                          <td className="py-3.5 pr-3">
                            <div className="font-medium">{b.guest.fullName}</div>
                            <div className="text-[11px] text-[#74796f]">{b.guest.email}</div>
                          </td>
                          <td className="py-3.5 pr-3">
                            {b.roomName}{' '}
                            <span className="text-[10px] px-1.5 py-0.5 bg-[#eae6dd] font-semibold">
                              {b.roomUnitNumber}
                            </span>
                          </td>
                          <td className="py-3.5 pr-3">
                            {b.checkIn} → {b.checkOut} ({b.nights}n)
                          </td>
                          <td className="py-3.5 pr-3 font-medium">
                            {formatMoneyExact(b.pricing.totalCents, db.settings.currencySymbol)}
                          </td>
                          <td className="py-3.5">
                            <span
                              className={`text-[10px] tracking-[0.12em] uppercase px-2.5 py-1 font-bold ${
                                b.status === 'Confirmed'
                                  ? 'bg-[#e2ebe6] text-[#2f6253]'
                                  : b.status === 'Cancelled'
                                  ? 'bg-[#efe3e0] text-[#8d453d]'
                                  : 'bg-[#eae6dd] text-[#5d655b]'
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-[#fffaf2] border border-[#d4d0c7] p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-serif text-2xl">House Activity Feed</h2>
                  {metrics.unreadNotifications > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        markAllNotificationsRead();
                        showToast('Marked all notifications as read.');
                      }}
                      className="text-[10px] tracking-[0.15em] uppercase font-bold text-[#b27356] underline"
                    >
                      Mark Read ({metrics.unreadNotifications})
                    </button>
                  )}
                </div>
                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                  {db.notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3.5 border-l-2 ${
                        n.read
                          ? 'border-[#d4d0c7] bg-[#f5f2eb]/60'
                          : 'border-[#b27356] bg-[#eae6dd]/60'
                      }`}
                    >
                      <div className="text-xs font-bold">{n.title}</div>
                      <p className="text-xs text-[#5d655b] mt-1 leading-relaxed">{n.message}</p>
                      <div className="text-[10px] text-[#74796f] mt-1.5">
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reservations' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="eyebrow">Reservation Ledger</span>
                <h1 className="font-serif text-4xl mt-2">Manage Guest Bookings</h1>
              </div>
              <button
                type="button"
                onClick={handleExportCsv}
                className="border border-[#23302a] px-4 py-2.5 text-[10px] tracking-[0.17em] uppercase font-bold hover:bg-[#23302a] hover:text-[#f5f2eb] transition"
              >
                Export CSV ({filteredBookings.length})
              </button>
            </div>

            <div className="bg-[#fffaf2] border border-[#d4d0c7] p-5 flex flex-wrap gap-4 items-center justify-between">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reference (SS-2026-...), guest name, email, or date..."
                className="flex-1 min-w-[260px] h-11 px-3.5 bg-white border border-[#d4d0c7] text-xs"
              />
              <div className="flex items-center gap-2 flex-wrap">
                {['ALL', 'Confirmed', 'Awaiting payment', 'Pending', 'Completed', 'Cancelled'].map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-3.5 py-2 text-[10px] tracking-[0.14em] uppercase font-bold border ${
                        statusFilter === st
                          ? 'bg-[#23302a] text-[#f5f2eb] border-[#23302a]'
                          : 'bg-transparent text-[#23302a] border-[#d4d0c7]'
                      }`}
                    >
                      {st}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="bg-[#fffaf2] border border-[#d4d0c7] overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#d4d0c7] bg-[#eae6dd] text-[10px] tracking-[0.15em] uppercase text-[#5d655b]">
                    <th className="p-4">Reference</th>
                    <th className="p-4">Guest &amp; Contact</th>
                    <th className="p-4">Accommodation</th>
                    <th className="p-4">Stay Dates</th>
                    <th className="p-4">Financials</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="border-b border-[#eae6dd] hover:bg-[#f5f2eb]/50">
                      <td className="p-4 font-mono font-bold">{b.reference}</td>
                      <td className="p-4">
                        <div className="font-bold text-sm">{b.guest.fullName}</div>
                        <div className="text-[#74796f]">{b.guest.email}</div>
                        <div className="text-[#74796f]">
                          {b.guest.phone} · {b.guest.country}
                        </div>
                        {b.specialRequests && (
                          <div className="mt-1 text-[11px] italic text-[#b27356]">
                            “{b.specialRequests}”
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{b.roomName}</div>
                        <div className="text-[11px] text-[#74796f] mt-0.5">
                          Assigned Unit: <strong>{b.roomUnitNumber}</strong> · {b.totalGuests} guest(s)
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          {b.checkIn} → {b.checkOut}
                        </div>
                        <div className="text-[11px] text-[#74796f]">{b.nights} night(s)</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold">
                          {formatMoneyExact(b.pricing.totalCents, db.settings.currencySymbol)}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-[#74796f]">
                          {b.paymentStatus} ({b.paymentMethod.replace(/_/g, ' ')})
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block text-[10px] tracking-[0.12em] uppercase px-2.5 py-1 font-bold ${
                            b.status === 'Confirmed'
                              ? 'bg-[#e2ebe6] text-[#2f6253]'
                              : b.status === 'Cancelled'
                              ? 'bg-[#efe3e0] text-[#8d453d]'
                              : 'bg-[#eae6dd] text-[#5d655b]'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setEditingBooking(b)}
                          className="border border-[#23302a] px-2.5 py-1.5 text-[10px] tracking-wider uppercase font-bold hover:bg-[#23302a] hover:text-white"
                        >
                          Edit / Assign
                        </button>
                        {b.status !== 'Confirmed' && b.status !== 'Cancelled' && (
                          <button
                            type="button"
                            onClick={() => {
                              updateBookingStatus(b.id, 'Confirmed', 'Paid in Full');
                              showToast(`Confirmed booking ${b.reference}.`);
                            }}
                            className="bg-[#243c35] text-white px-2.5 py-1.5 text-[10px] tracking-wider uppercase font-bold"
                          >
                            Confirm &amp; Mark Paid
                          </button>
                        )}
                        {b.status !== 'Cancelled' && (
                          <button
                            type="button"
                            onClick={() => {
                              updateBookingStatus(b.id, 'Cancelled');
                              showToast(
                                `Cancelled ${b.reference} and returned unit ${b.roomUnitNumber} to available inventory.`
                              );
                            }}
                            className="border border-[#8d453d] text-[#8d453d] px-2.5 py-1.5 text-[10px] tracking-wider uppercase font-bold hover:bg-[#8d453d] hover:text-white"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {editingBooking && (
              <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                <div className="bg-[#f5f2eb] border border-[#d4d0c7] p-7 max-w-lg w-full space-y-4">
                  <div className="flex justify-between items-center border-b border-[#d4d0c7] pb-3">
                    <h3 className="font-serif text-2xl">
                      Manage Reservation {editingBooking.reference}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingBooking(null)}
                      className="text-xs uppercase font-bold"
                    >
                      Close ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="field">
                      <label>Guest Full Name</label>
                      <input
                        type="text"
                        value={editingBooking.guest.fullName}
                        onChange={(e) =>
                          setEditingBooking({
                            ...editingBooking,
                            guest: { ...editingBooking.guest, fullName: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Guest Email</label>
                      <input
                        type="email"
                        value={editingBooking.guest.email}
                        onChange={(e) =>
                          setEditingBooking({
                            ...editingBooking,
                            guest: { ...editingBooking.guest, email: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Booking Status</label>
                      <select
                        value={editingBooking.status}
                        onChange={(e) =>
                          setEditingBooking({
                            ...editingBooking,
                            status: e.target.value as BookingStatus,
                          })
                        }
                      >
                        <option value="Pending">Pending</option>
                        <option value="Awaiting payment">Awaiting payment</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Payment Status</label>
                      <select
                        value={editingBooking.paymentStatus}
                        onChange={(e) =>
                          setEditingBooking({
                            ...editingBooking,
                            paymentStatus: e.target.value as PaymentStatus,
                          })
                        }
                      >
                        <option value="Unpaid">Unpaid</option>
                        <option value="Deposit Paid">Deposit Paid</option>
                        <option value="Paid in Full">Paid in Full</option>
                        <option value="Refunded">Refunded</option>
                      </select>
                    </div>
                    <div className="field sm:col-span-2">
                      <label>Assigned Physical Room Unit</label>
                      <select
                        value={editingBooking.roomUnitId}
                        onChange={(e) => {
                          const unit = db.roomUnits.find((u) => u.id === e.target.value);
                          if (unit) {
                            setEditingBooking({
                              ...editingBooking,
                              roomUnitId: unit.id,
                              roomUnitNumber: unit.unitNumber,
                            });
                          }
                        }}
                      >
                        {db.roomUnits
                          .filter((u) => u.roomTypeId === editingBooking.roomTypeId)
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              Unit {u.unitNumber} ({u.floor} · {u.maintenanceStatus})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="field sm:col-span-2">
                      <label>Special Requests / Dietary Notes</label>
                      <textarea
                        value={editingBooking.specialRequests}
                        onChange={(e) =>
                          setEditingBooking({
                            ...editingBooking,
                            specialRequests: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setEditingBooking(null)}
                      className="border border-[#d4d0c7] px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateBookingDetails(editingBooking.id, {
                          roomUnitId: editingBooking.roomUnitId,
                          roomUnitNumber: editingBooking.roomUnitNumber,
                          specialRequests: editingBooking.specialRequests,
                          guest: editingBooking.guest,
                        });
                        updateBookingStatus(
                          editingBooking.id,
                          editingBooking.status,
                          editingBooking.paymentStatus
                        );
                        setEditingBooking(null);
                        showToast(`Updated reservation ${editingBooking.reference}.`);
                      }}
                      className="bg-[#243c35] text-white px-5 py-2.5 text-[10px] uppercase tracking-widest font-bold"
                    >
                      Save Reservation Changes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'rooms' && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="eyebrow">Accommodation Catalogue</span>
                <h1 className="font-serif text-4xl mt-2">Room Categories &amp; Details</h1>
              </div>
              <button
                type="button"
                onClick={() => {
                  const idx = db.roomTypes.length + 1;
                  setEditingRoom({
                    id: `room-custom-${Date.now()}`,
                    slug: `custom-suite-${idx}`,
                    indexLabel: `ROOM 0${idx} / 0${idx}`,
                    name: 'The Courtyard Pavilion',
                    category: 'Private Pavilion',
                    badge: 'New',
                    shortMeta: '2 guests   /   King bed   /   Courtyard pool',
                    description:
                      'A secluded lime-plastered pavilion with private plunge pool and shaded veranda.',
                    featuredImage:
                      'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1050&q=82',
                    gallery: [
                      'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=85',
                    ],
                    pricePerNightCents: 29500,
                    maxGuests: 2,
                    maxAdults: 2,
                    maxChildren: 1,
                    bedTypes: '1 Teak Canopy King Bed',
                    roomSize: '72 m² with courtyard plunge pool',
                    amenities: ['Private plunge pool', 'Outdoor rain shower', 'Organic linen bedding'],
                    rules: ['Check-in from 14:00 · Check-out by 11:00', 'Maximum 2 guests'],
                    availabilityStatus: 'available',
                  });
                }}
                className="bg-[#243c35] text-white px-5 py-3 text-[10px] tracking-[0.17em] uppercase font-bold"
              >
                + Add New Room Category
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {db.roomTypes.map((room) => {
                const units = db.roomUnits.filter((u) => u.roomTypeId === room.id);
                const activeCount = units.filter((u) => u.maintenanceStatus === 'active').length;
                return (
                  <div
                    key={room.id}
                    className="bg-[#fffaf2] border border-[#d4d0c7] flex flex-col justify-between"
                  >
                    <div>
                      <div className="aspect-[1.35] overflow-hidden bg-[#dcd9ce] relative">
                        <img
                          src={room.featuredImage}
                          alt={room.name}
                          className="w-full h-full object-cover"
                        />
                        {room.badge && (
                          <span className="room-badge">{room.badge}</span>
                        )}
                      </div>
                      <div className="p-6">
                        <div className="text-[10px] tracking-[0.16em] uppercase text-[#74796f]">
                          {room.indexLabel} · {room.category}
                        </div>
                        <h3 className="font-serif text-3xl mt-1 mb-2">{room.name}</h3>
                        <p className="text-xs text-[#5d655b] leading-relaxed mb-4">
                          {room.description}
                        </p>
                        <div className="text-xs space-y-1 border-t border-[#eae6dd] pt-3 text-[#5d655b]">
                          <div>
                            <strong>Nightly Rate:</strong>{' '}
                            {formatMoneyExact(room.pricePerNightCents, db.settings.currencySymbol)}
                          </div>
                          <div>
                            <strong>Max Capacity:</strong> {room.maxGuests} guests
                          </div>
                          <div>
                            <strong>Physical Inventory:</strong> {activeCount} active / {units.length}{' '}
                            total units
                          </div>
                          <div>
                            <strong>Room Size:</strong> {room.roomSize}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 pt-0">
                      <button
                        type="button"
                        onClick={() => setEditingRoom({ ...room })}
                        className="w-full border border-[#23302a] py-3 text-[10px] tracking-[0.17em] uppercase font-bold hover:bg-[#23302a] hover:text-white transition"
                      >
                        Edit Room Configuration
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {editingRoom && (
              <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                <div className="bg-[#f5f2eb] border border-[#d4d0c7] p-7 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4">
                  <div className="flex justify-between items-center border-b border-[#d4d0c7] pb-3">
                    <h3 className="font-serif text-2xl">Edit Room: {editingRoom.name}</h3>
                    <button
                      type="button"
                      onClick={() => setEditingRoom(null)}
                      className="text-xs uppercase font-bold"
                    >
                      Close ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="field">
                      <label>Room Name</label>
                      <input
                        type="text"
                        value={editingRoom.name}
                        onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Badge (Optional)</label>
                      <input
                        type="text"
                        value={editingRoom.badge || ''}
                        onChange={(e) => setEditingRoom({ ...editingRoom, badge: e.target.value })}
                        placeholder="e.g. Our favorite"
                      />
                    </div>
                    <div className="field">
                      <label>Default Nightly Rate (USD)</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={Math.round(editingRoom.pricePerNightCents / 100)}
                        onChange={(e) =>
                          setEditingRoom({
                            ...editingRoom,
                            pricePerNightCents: Math.max(100, Number(e.target.value) * 100),
                          })
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Max Guest Capacity</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={editingRoom.maxGuests}
                        onChange={(e) =>
                          setEditingRoom({
                            ...editingRoom,
                            maxGuests: Math.max(1, Number(e.target.value)),
                            maxAdults: Math.max(1, Number(e.target.value)),
                          })
                        }
                      />
                    </div>
                    <div className="field sm:col-span-2">
                      <label>Card Summary Line (Meta)</label>
                      <input
                        type="text"
                        value={editingRoom.shortMeta}
                        onChange={(e) =>
                          setEditingRoom({ ...editingRoom, shortMeta: e.target.value })
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Bed Types</label>
                      <input
                        type="text"
                        value={editingRoom.bedTypes}
                        onChange={(e) =>
                          setEditingRoom({ ...editingRoom, bedTypes: e.target.value })
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Room Size</label>
                      <input
                        type="text"
                        value={editingRoom.roomSize}
                        onChange={(e) =>
                          setEditingRoom({ ...editingRoom, roomSize: e.target.value })
                        }
                      />
                    </div>
                    <div className="field sm:col-span-2">
                      <label>Featured Photograph URL</label>
                      <input
                        type="url"
                        value={editingRoom.featuredImage}
                        onChange={(e) =>
                          setEditingRoom({ ...editingRoom, featuredImage: e.target.value })
                        }
                      />
                    </div>
                    <div className="field sm:col-span-2">
                      <label>Description</label>
                      <textarea
                        value={editingRoom.description}
                        onChange={(e) =>
                          setEditingRoom({ ...editingRoom, description: e.target.value })
                        }
                      />
                    </div>
                    <div className="field sm:col-span-2">
                      <label>Amenities (One per line)</label>
                      <textarea
                        value={editingRoom.amenities.join('\n')}
                        onChange={(e) =>
                          setEditingRoom({
                            ...editingRoom,
                            amenities: e.target.value
                              .split('\n')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Availability Status</label>
                      <select
                        value={editingRoom.availabilityStatus}
                        onChange={(e) =>
                          setEditingRoom({
                            ...editingRoom,
                            availabilityStatus: e.target.value as RoomType['availabilityStatus'],
                          })
                        }
                      >
                        <option value="available">Available for Booking</option>
                        <option value="maintenance">Closed for Maintenance</option>
                        <option value="hidden">Hidden from Website</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-[#d4d0c7]">
                    <button
                      type="button"
                      onClick={() => setEditingRoom(null)}
                      className="border border-[#d4d0c7] px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        saveRoomType(editingRoom);
                        setEditingRoom(null);
                        showToast(`Saved room changes for ${editingRoom.name}.`);
                      }}
                      className="bg-[#243c35] text-white px-5 py-2.5 text-[10px] uppercase tracking-widest font-bold"
                    >
                      Save Room Category
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-10">
            <div>
              <span className="eyebrow">Inventory &amp; Yield Control</span>
              <h1 className="font-serif text-4xl mt-2">Physical Units, Maintenance Blocks &amp; Seasonal Rates</h1>
            </div>

            {/* Physical Units */}
            <div className="bg-[#fffaf2] border border-[#d4d0c7] p-6 space-y-5">
              <h2 className="font-serif text-2xl">Physical Room Units ({db.roomUnits.length})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {db.roomUnits.map((u) => {
                  const rt = db.roomTypes.find((r) => r.id === u.roomTypeId);
                  return (
                    <div
                      key={u.id}
                      className={`p-3.5 border ${
                        u.maintenanceStatus === 'active'
                          ? 'border-[#d4d0c7] bg-[#f5f2eb]'
                          : 'border-[#8d453d] bg-[#efe3e0]'
                      }`}
                    >
                      <div className="font-mono font-bold text-sm">{u.unitNumber}</div>
                      <div className="text-[11px] text-[#5d655b] truncate">{rt?.name}</div>
                      <div className="text-[10px] uppercase tracking-wider mt-2 flex items-center justify-between">
                        <span>{u.maintenanceStatus}</span>
                        <button
                          type="button"
                          onClick={() => {
                            toggleRoomUnitMaintenance(u.id);
                            showToast(`Toggled status for unit ${u.unitNumber}.`);
                          }}
                          className="underline font-bold"
                        >
                          Toggle
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newUnitNumber.trim()) return;
                  addRoomUnit(newUnitRoomId, newUnitNumber, newUnitFloor);
                  setNewUnitNumber('');
                  showToast(`Added physical unit ${newUnitNumber.toUpperCase()}.`);
                }}
                className="pt-4 border-t border-[#eae6dd] flex flex-wrap gap-3 items-end"
              >
                <div className="field">
                  <label>Room Category</label>
                  <select
                    value={newUnitRoomId}
                    onChange={(e) => setNewUnitRoomId(e.target.value)}
                  >
                    {db.roomTypes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>New Unit Code</label>
                  <input
                    type="text"
                    placeholder="e.g. G-106"
                    value={newUnitNumber}
                    onChange={(e) => setNewUnitNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label>Wing / Location</label>
                  <input
                    type="text"
                    value={newUnitFloor}
                    onChange={(e) => setNewUnitFloor(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="bg-[#243c35] text-white px-5 h-[49px] text-[10px] tracking-[0.16em] uppercase font-bold"
                >
                  + Add Physical Unit
                </button>
              </form>
            </div>

            {/* Date Blocks & Seasonal Pricing */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[#fffaf2] border border-[#d4d0c7] p-6 space-y-4">
                <h2 className="font-serif text-2xl">Block Inventory Dates</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (blockEnd <= blockStart) return;
                    addRoomBlock({
                      roomTypeId: blockRoomTypeId,
                      startDate: blockStart,
                      endDate: blockEnd,
                      reason: blockReason,
                    });
                    showToast('Added inventory maintenance block.');
                  }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  <div className="field sm:col-span-2">
                    <label>Room Category</label>
                    <select
                      value={blockRoomTypeId}
                      onChange={(e) => setBlockRoomTypeId(e.target.value)}
                    >
                      {db.roomTypes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={blockStart}
                      onChange={(e) => setBlockStart(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label>End Date</label>
                    <input
                      type="date"
                      value={blockEnd}
                      onChange={(e) => setBlockEnd(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field sm:col-span-2">
                    <label>Reason</label>
                    <input
                      type="text"
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="sm:col-span-2 bg-[#23302a] text-white py-3 text-[10px] tracking-[0.16em] uppercase font-bold"
                  >
                    Block 1 Unit for Selected Dates
                  </button>
                </form>

                <div className="space-y-2 pt-3 border-t border-[#eae6dd]">
                  {db.roomBlocks.length === 0 ? (
                    <div className="text-xs text-[#74796f]">No active date blocks.</div>
                  ) : (
                    db.roomBlocks.map((blk) => {
                      const rt = db.roomTypes.find((r) => r.id === blk.roomTypeId);
                      return (
                        <div
                          key={blk.id}
                          className="flex justify-between items-center p-3 bg-[#f5f2eb] text-xs"
                        >
                          <div>
                            <strong>{rt?.name}</strong>: {blk.startDate} → {blk.endDate} ({blk.reason})
                          </div>
                          <button
                            type="button"
                            onClick={() => removeRoomBlock(blk.id)}
                            className="text-[#8d453d] font-bold uppercase text-[10px]"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="bg-[#fffaf2] border border-[#d4d0c7] p-6 space-y-4">
                <h2 className="font-serif text-2xl">Seasonal Pricing Rules</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addSeasonalRate({
                      roomTypeId: rateRoomTypeId,
                      label: rateLabel,
                      startDate: rateStart,
                      endDate: rateEnd,
                      nightlyPriceCents: Math.max(100, Number(ratePriceDollars) * 100),
                      minStayNights: Math.max(1, Number(rateMinStay)),
                    });
                    showToast('Added seasonal rate rule.');
                  }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  <div className="field">
                    <label>Room Category</label>
                    <select
                      value={rateRoomTypeId}
                      onChange={(e) => setRateRoomTypeId(e.target.value)}
                    >
                      {db.roomTypes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Season Label</label>
                    <input
                      type="text"
                      value={rateLabel}
                      onChange={(e) => setRateLabel(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={rateStart}
                      onChange={(e) => setRateStart(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label>End Date</label>
                    <input
                      type="date"
                      value={rateEnd}
                      onChange={(e) => setRateEnd(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label>Nightly Price (USD)</label>
                    <input
                      type="number"
                      value={ratePriceDollars}
                      onChange={(e) => setRatePriceDollars(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label>Minimum Stay (Nights)</label>
                    <input
                      type="number"
                      min="1"
                      value={rateMinStay}
                      onChange={(e) => setRateMinStay(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="sm:col-span-2 bg-[#243c35] text-white py-3 text-[10px] tracking-[0.16em] uppercase font-bold"
                  >
                    Save Seasonal Rate
                  </button>
                </form>

                <div className="space-y-2 pt-3 border-t border-[#eae6dd]">
                  {db.seasonalRates.map((sr) => {
                    const rt = db.roomTypes.find((r) => r.id === sr.roomTypeId);
                    return (
                      <div
                        key={sr.id}
                        className="flex justify-between items-center p-3 bg-[#f5f2eb] text-xs"
                      >
                        <div>
                          <strong>{rt?.name}</strong> · {sr.label} ({sr.startDate} to {sr.endDate}) —{' '}
                          <strong>
                            {formatMoneyExact(sr.nightlyPriceCents, db.settings.currencySymbol)}/night
                          </strong>{' '}
                          (Min {sr.minStayNights}n)
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSeasonalRate(sr.id)}
                          className="text-[#8d453d] font-bold uppercase text-[10px]"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cms' && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="eyebrow">Editorial Content Management</span>
                <h1 className="font-serif text-4xl mt-2">Website Copy &amp; Photography</h1>
              </div>
              <button
                type="button"
                onClick={() => {
                  updateWebsiteContent(cmsDraft);
                  showToast('Published website content updates to live site.');
                }}
                className="bg-[#243c35] text-white px-6 py-3.5 text-[10px] tracking-[0.18em] uppercase font-bold"
              >
                Publish Changes to Website
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hero CMS */}
              <div className="bg-[#fffaf2] border border-[#d4d0c7] p-6 space-y-4">
                <h2 className="font-serif text-2xl">01 · Hero Section</h2>
                <div className="field">
                  <label>Eyebrow</label>
                  <input
                    type="text"
                    value={cmsDraft.hero.eyebrow}
                    onChange={(e) =>
                      setCmsDraft({
                        ...cmsDraft,
                        hero: { ...cmsDraft.hero, eyebrow: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="field">
                    <label>Headline Line 1</label>
                    <input
                      type="text"
                      value={cmsDraft.hero.titleLine1}
                      onChange={(e) =>
                        setCmsDraft({
                          ...cmsDraft,
                          hero: { ...cmsDraft.hero, titleLine1: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Headline Line 2 (Italic)</label>
                    <input
                      type="text"
                      value={cmsDraft.hero.titleLine2Em}
                      onChange={(e) =>
                        setCmsDraft({
                          ...cmsDraft,
                          hero: { ...cmsDraft.hero, titleLine2Em: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="field">
                  <label>Introductory Copy</label>
                  <textarea
                    value={cmsDraft.hero.copy}
                    onChange={(e) =>
                      setCmsDraft({
                        ...cmsDraft,
                        hero: { ...cmsDraft.hero, copy: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label>Hero Photograph URL</label>
                  <input
                    type="url"
                    value={cmsDraft.hero.backgroundImage}
                    onChange={(e) =>
                      setCmsDraft({
                        ...cmsDraft,
                        hero: { ...cmsDraft.hero, backgroundImage: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              {/* Story / Intro CMS */}
              <div className="bg-[#fffaf2] border border-[#d4d0c7] p-6 space-y-4">
                <h2 className="font-serif text-2xl">02 · Story &amp; Welcome Section</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="field">
                    <label>Title Line 1</label>
                    <input
                      type="text"
                      value={cmsDraft.intro.titleLine1}
                      onChange={(e) =>
                        setCmsDraft({
                          ...cmsDraft,
                          intro: { ...cmsDraft.intro, titleLine1: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Title Line 2 (Emphasized)</label>
                    <input
                      type="text"
                      value={cmsDraft.intro.titleLine2Em}
                      onChange={(e) =>
                        setCmsDraft({
                          ...cmsDraft,
                          intro: { ...cmsDraft.intro, titleLine2Em: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="field">
                  <label>Story Paragraph</label>
                  <textarea
                    value={cmsDraft.intro.body}
                    onChange={(e) =>
                      setCmsDraft({
                        ...cmsDraft,
                        intro: { ...cmsDraft.intro, body: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label>Italic Seal Quote</label>
                  <input
                    type="text"
                    value={cmsDraft.intro.sealText}
                    onChange={(e) =>
                      setCmsDraft({
                        ...cmsDraft,
                        intro: { ...cmsDraft.intro, sealText: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              {/* Dining CMS */}
              <div className="bg-[#fffaf2] border border-[#d4d0c7] p-6 space-y-4">
                <h2 className="font-serif text-2xl">03 · Dining Section</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="field">
                    <label>Dining Headline Line 1</label>
                    <input
                      type="text"
                      value={cmsDraft.dining.titleLine1}
                      onChange={(e) =>
                        setCmsDraft({
                          ...cmsDraft,
                          dining: { ...cmsDraft.dining, titleLine1: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Dining Headline Line 2 (Italic)</label>
                    <input
                      type="text"
                      value={cmsDraft.dining.titleLine2Em}
                      onChange={(e) =>
                        setCmsDraft({
                          ...cmsDraft,
                          dining: { ...cmsDraft.dining, titleLine2Em: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="field">
                  <label>Dining Description</label>
                  <textarea
                    value={cmsDraft.dining.body}
                    onChange={(e) =>
                      setCmsDraft({
                        ...cmsDraft,
                        dining: { ...cmsDraft.dining, body: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label>Dining Image URL</label>
                  <input
                    type="url"
                    value={cmsDraft.dining.image}
                    onChange={(e) =>
                      setCmsDraft({
                        ...cmsDraft,
                        dining: { ...cmsDraft.dining, image: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              {/* Location & Footer CMS */}
              <div className="bg-[#fffaf2] border border-[#d4d0c7] p-6 space-y-4">
                <h2 className="font-serif text-2xl">04 · Location &amp; Footer</h2>
                <div className="field">
                  <label>Location Description</label>
                  <textarea
                    value={cmsDraft.location.body}
                    onChange={(e) =>
                      setCmsDraft({
                        ...cmsDraft,
                        location: { ...cmsDraft.location, body: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="field">
                    <label>Location Card Title</label>
                    <input
                      type="text"
                      value={cmsDraft.location.bubbleTitle}
                      onChange={(e) =>
                        setCmsDraft({
                          ...cmsDraft,
                          location: { ...cmsDraft.location, bubbleTitle: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Location Card Subtitle</label>
                    <input
                      type="text"
                      value={cmsDraft.location.bubbleLine2}
                      onChange={(e) =>
                        setCmsDraft({
                          ...cmsDraft,
                          location: { ...cmsDraft.location, bubbleLine2: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="field">
                  <label>Footer Copyright Notice</label>
                  <input
                    type="text"
                    value={cmsDraft.footer.copyrightSuffix}
                    onChange={(e) =>
                      setCmsDraft({
                        ...cmsDraft,
                        footer: { ...cmsDraft.footer, copyrightSuffix: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'communications' && (
          <div className="space-y-8">
            <div>
              <span className="eyebrow">Guest Communications</span>
              <h1 className="font-serif text-4xl mt-2">Transactional Emails &amp; Dining Enquiries</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[#fffaf2] border border-[#d4d0c7] p-6 space-y-4">
                <h2 className="font-serif text-2xl">
                  Transactional Email Log ({db.emails.length})
                </h2>
                {db.emails.length === 0 ? (
                  <p className="text-xs text-[#74796f]">
                    Transactional emails appear here immediately when bookings or cancellations occur.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {db.emails.map((em) => (
                      <div key={em.id} className="p-4 bg-[#f5f2eb] border border-[#d4d0c7] text-xs">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="font-bold">{em.subject}</div>
                            <div className="text-[#74796f] mt-0.5">To: {em.to}</div>
                          </div>
                          <span className="text-[10px] uppercase px-2 py-0.5 bg-[#eae6dd] font-bold">
                            {em.deliveryStatus === 'sent' ? 'Sent via Provider' : 'Local HTML Preview'}
                          </span>
                        </div>
                        <div className="mt-3 flex justify-between items-center">
                          <span className="text-[10px] text-[#74796f]">
                            {new Date(em.createdAt).toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPreviewEmailHtml(em.htmlBody)}
                            className="underline font-bold text-[10px] uppercase tracking-wider"
                          >
                            Preview Branded Email
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#fffaf2] border border-[#d4d0c7] p-6 space-y-4">
                <h2 className="font-serif text-2xl">
                  Dining Table Enquiries ({db.diningEnquiries.length})
                </h2>
                {db.diningEnquiries.length === 0 ? (
                  <p className="text-xs text-[#74796f]">
                    No dining table enquiries received yet. Visitors can submit enquiries from the Dining section.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {db.diningEnquiries.map((de) => (
                      <div key={de.id} className="p-4 bg-[#f5f2eb] border border-[#d4d0c7] text-xs">
                        <div className="font-bold">
                          {de.name} ({de.email})
                        </div>
                        <div className="text-[#5d655b] mt-1">
                          Requested Date: <strong>{de.date}</strong> · {de.guests} guest(s)
                        </div>
                        {de.dietaryNotes && (
                          <div className="text-[#74796f] italic mt-1">“{de.dietaryNotes}”</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {previewEmailHtml && (
              <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                <div className="bg-[#f5f2eb] border border-[#d4d0c7] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                    <span className="eyebrow">Transactional Email Render</span>
                    <button
                      type="button"
                      onClick={() => setPreviewEmailHtml(null)}
                      className="text-xs uppercase font-bold"
                    >
                      Close ✕
                    </button>
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: previewEmailHtml }} />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="eyebrow">System &amp; Financial Configuration</span>
                <h1 className="font-serif text-4xl mt-2">Hotel Policies, Taxes &amp; Gateways</h1>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const fresh = resetDemoDatabase();
                    setCmsDraft(fresh.content);
                    setSettingsDraft(fresh.settings);
                    showToast('Reset hotel database to default seed state.');
                  }}
                  className="border border-[#8d453d] text-[#8d453d] px-4 py-3 text-[10px] tracking-[0.16em] uppercase font-bold"
                >
                  Reset Demo Data
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateHotelSettings(settingsDraft);
                    showToast('Saved hotel configuration and payment settings.');
                  }}
                  className="bg-[#243c35] text-white px-6 py-3 text-[10px] tracking-[0.18em] uppercase font-bold"
                >
                  Save Settings
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#fffaf2] border border-[#d4d0c7] p-6 space-y-4">
                <h2 className="font-serif text-2xl">Property Contact &amp; Taxes</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="field">
                    <label>Hotel Email</label>
                    <input
                      type="email"
                      value={settingsDraft.email}
                      onChange={(e) =>
                        setSettingsDraft({ ...settingsDraft, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Hotel Phone</label>
                    <input
                      type="text"
                      value={settingsDraft.phone}
                      onChange={(e) =>
                        setSettingsDraft({ ...settingsDraft, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Tax Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="35"
                      value={settingsDraft.taxRatePercent}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          taxRatePercent: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Service Charge (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="25"
                      value={settingsDraft.serviceChargePercent}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          serviceChargePercent: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                <div className="field">
                  <label>Street Address (Ahangama)</label>
                  <input
                    type="text"
                    value={settingsDraft.address}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, address: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label>Cancellation Policy</label>
                  <textarea
                    value={settingsDraft.cancellationPolicy}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        cancellationPolicy: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="bg-[#fffaf2] border border-[#d4d0c7] p-6 space-y-5">
                <h2 className="font-serif text-2xl">Payment &amp; Communication Boundaries</h2>
                <p className="text-xs text-[#5d655b] leading-relaxed">
                  Per hospitality security standards, live online card processing is disabled until merchant credentials (such as PayHere Sri Lanka or Stripe) are configured. You can toggle these modes below.
                </p>

                <label className="flex items-start gap-3 p-4 bg-[#f5f2eb] border border-[#d4d0c7] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsDraft.payAtHotelEnabled}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        payAtHotelEnabled: e.target.checked,
                      })
                    }
                    className="mt-1"
                  />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider">
                      Enable “Pay at Hotel / Direct Bank Settlement”
                    </div>
                    <div className="text-xs text-[#74796f] mt-1">
                      Allows guests to finalize confirmed reservations with payment settled upon arrival in Ahangama.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 bg-[#f5f2eb] border border-[#d4d0c7] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsDraft.onlinePaymentConfigured}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        onlinePaymentConfigured: e.target.checked,
                      })
                    }
                    className="mt-1"
                  />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider">
                      Merchant Payment Gateway Configured ({settingsDraft.paymentProviderName})
                    </div>
                    <div className="text-xs text-[#74796f] mt-1">
                      When unchecked, online deposit and full advance card options are clearly marked as unconfigured in the booking engine.
                    </div>
                  </div>
                </label>

                <div className="field">
                  <label>Advance Deposit Percentage (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={settingsDraft.depositPercent}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        depositPercent: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
