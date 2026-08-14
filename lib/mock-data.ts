import type {
  Beneficiary,
  CoordinatorPoolSummary,
  CreditMovement,
  Dispute,
  Hub,
  Pool,
  PoolReport,
  PurchaseOrder,
  QuoteRequest,
  RosterMember,
  UnmatchedTransfer,
} from "./types";

export const AREAS = ["abuja", "lagos"] as const;
export const DEFAULT_AREA = "abuja";

export const AREA_LABELS: Record<string, string> = {
  abuja: "Abuja",
  lagos: "Lagos",
};

export const LIVE_AREAS = new Set(["abuja"]);

export function formatNaira(amount: number): string {
  return "₦" + Math.round(amount).toLocaleString("en-NG");
}

export function slotsLeftLabel(n: number): string {
  return `${n} slot${n === 1 ? "" : "s"} left`;
}

export const HUBS: Hub[] = [
  {
    id: "wuse",
    name: "Wuse II hub",
    area: "abuja",
    address: "12 Aminu Kano Crescent, Wuse II",
    landmark: "Behind the Total filling station",
    windows: "Sat and Sun, 09:00 to 15:00",
    capacityPerHour: 30,
    notes: "30 handovers an hour",
    openPools: 2,
  },
  {
    id: "lugbe",
    name: "Lugbe hub",
    area: "abuja",
    address: "Lugbe access road, by the NNPC filling station",
    landmark: "Cold room on site",
    windows: "Sun only, 10:00 to 16:00",
    capacityPerHour: 20,
    notes: "Cold room on site",
    openPools: 1,
  },
  {
    id: "karu",
    name: "Karu hub",
    area: "abuja",
    address: "Karu market road, dry goods store 4",
    landmark: "Dry goods only",
    windows: "Sat, 09:00 to 13:00",
    capacityPerHour: 25,
    notes: "Dry goods only",
    openPools: 2,
  },
  {
    id: "kuje",
    name: "Kuje hub",
    area: "abuja",
    address: "Green gate opposite the mosque, Kuje market road",
    landmark: "Green gate opposite the mosque",
    windows: "Sat, 08:00 to 14:00",
    capacityPerHour: 30,
    notes: "Butchering on site",
    openPools: 1,
  },
];

export const POOLS: Pool[] = [
  {
    id: "a-2214",
    code: "A-2214",
    area: "abuja",
    hubId: "lugbe",
    hubName: "Lugbe hub",
    title: "Live ram, medium",
    category: "meat",
    photoCaption: "the actual ram, shot by our field agent at Gwagwalada",
    description:
      "One ram of 55kg to 62kg live weight, split forty ways after butchering at the hub. Each slot is roughly 2.5kg of mixed cuts. Supplied by Gwagwalada Livestock Aggregators, who have delivered nine orders to us with a 97% yield accuracy score.",
    unitDescription: "≈2.5kg mixed cuts per slot, ±8%. Share date Sun 24 Aug.",
    toleranceBand: "±8%, credited if under",
    totalSlots: 40,
    paidSlots: 36,
    reservedUnpaidSlots: 3,
    threshold: 16,
    pricePerSlot: 8400,
    marketPricePerSlot: 10900,
    closesAt: "Fri 18:00",
    shareDate: "Sunday 24 August",
    state: "open",
    supplier: "Gwagwalada Livestock Aggregators",
    cutsBreakdown: "40% prime, 40% secondary, 20% trim",
  },
  {
    id: "a-2231",
    code: "A-2231",
    area: "abuja",
    hubId: "karu",
    hubName: "Karu hub",
    title: "Rice, 50kg bag",
    category: "grains",
    photoCaption: "stacked rice bags",
    description:
      "One whole 50kg bag of long grain rice per slot, sourced from Karu Grains. Exact weight, no tolerance band, because rice does not shrink between the mill and the hub the way meat does.",
    unitDescription: "One whole bag per slot. Exact weight, no tolerance band.",
    totalSlots: 14,
    paidSlots: 12,
    reservedUnpaidSlots: 0,
    threshold: 12,
    pricePerSlot: 62000,
    closesAt: "Thu 18:00",
    shareDate: "Saturday 23 August",
    state: "open",
    supplier: "Karu Grains",
  },
  {
    id: "a-2240",
    code: "A-2240",
    area: "abuja",
    hubId: "wuse",
    hubName: "Wuse hub",
    title: "Catfish, live",
    category: "meat",
    photoCaption: "live catfish pond",
    description:
      "5 pieces per slot, 1.2kg average each, from a pond at Gwagwalada. Killed and cleaned at the hub on request.",
    unitDescription:
      "5 pieces per slot, 1.2kg average each. Killed and cleaned at the hub on request.",
    totalSlots: 50,
    paidSlots: 19,
    reservedUnpaidSlots: 0,
    threshold: 40,
    pricePerSlot: 11500,
    closesAt: "6 days left",
    shareDate: "Monday 25 August",
    state: "open",
    supplier: "Gwagwalada Aquaculture",
  },
  {
    id: "a-2244",
    code: "A-2244",
    area: "abuja",
    hubId: "wuse",
    hubName: "Wuse hub",
    title: "Palm oil, 5 litres",
    category: "produce",
    photoCaption: "palm oil kegs",
    description: "5 litre keg of unrefined palm oil per slot, sourced direct from a mill in Kogi.",
    unitDescription: "One 5 litre keg per slot.",
    totalSlots: 80,
    paidSlots: 36,
    reservedUnpaidSlots: 0,
    threshold: 50,
    pricePerSlot: 9200,
    closesAt: "Tue 18:00",
    shareDate: "Saturday 23 August",
    state: "open",
    supplier: "Kogi Palm Millers Cooperative",
  },
  {
    id: "a-2190",
    code: "A-2190",
    area: "abuja",
    hubId: "kuje",
    hubName: "Kuje hub",
    title: "Cow, Kuje aggregator",
    category: "meat",
    photoCaption: "the cow at intake, Kuje yard",
    description:
      "One cow split forty ways after butchering at Kuje hub. Supplied by Kuje Livestock Aggregators.",
    unitDescription: "≈2.5kg mixed cuts per slot, ±8%.",
    toleranceBand: "±8%, credited if under",
    totalSlots: 40,
    paidSlots: 40,
    reservedUnpaidSlots: 0,
    threshold: 16,
    pricePerSlot: 8400,
    closesAt: "closed",
    shareDate: "Saturday 8 August",
    state: "completed",
    supplier: "Kuje Livestock Aggregators",
    cutsBreakdown: "40% prime, 40% secondary, 20% trim",
  },
  {
    id: "a-2185",
    code: "A-2185",
    area: "abuja",
    hubId: "karu",
    hubName: "Karu hub",
    title: "Beans, 100kg bag",
    category: "grains",
    photoCaption: "sacks of brown beans",
    description: "100kg bag of brown beans split into 30 slots.",
    unitDescription: "≈ 3.3kg per slot.",
    totalSlots: 30,
    paidSlots: 30,
    reservedUnpaidSlots: 0,
    threshold: 15,
    pricePerSlot: 6900,
    closesAt: "closed",
    shareDate: "Tuesday 21 July",
    state: "completed",
    supplier: "Karu Grains",
  },
  {
    id: "a-2226",
    code: "A-2226",
    area: "abuja",
    hubId: "wuse",
    hubName: "Wuse hub",
    title: "Catfish, live",
    category: "meat",
    photoCaption: "live catfish pond",
    description: "5 pieces per slot. This pool did not reach its threshold and was cancelled.",
    unitDescription: "5 pieces per slot, 1.2kg average each.",
    totalSlots: 50,
    paidSlots: 19,
    reservedUnpaidSlots: 0,
    threshold: 40,
    pricePerSlot: 11500,
    closesAt: "closed",
    shareDate: "—",
    state: "underfilled",
    supplier: "Gwagwalada Aquaculture",
  },
  {
    id: "a-2166",
    code: "A-2166",
    area: "abuja",
    hubId: "lugbe",
    hubName: "Lugbe hub",
    title: "Catfish, live",
    category: "meat",
    photoCaption: "live catfish pond",
    description: "Completed pool with one open quality dispute.",
    unitDescription: "5 pieces per slot, 1.2kg average each.",
    totalSlots: 50,
    paidSlots: 50,
    reservedUnpaidSlots: 0,
    threshold: 40,
    pricePerSlot: 11500,
    closesAt: "closed",
    shareDate: "Tuesday 4 August",
    state: "completed",
    supplier: "Gwagwalada Aquaculture",
  },
];

export function getPool(id: string): Pool {
  return POOLS.find((p) => p.id === id.toLowerCase()) ?? POOLS[0];
}

export function poolsByArea(area: string): Pool[] {
  return POOLS.filter((p) => p.area === area);
}

export function openPoolsByArea(area: string): Pool[] {
  return poolsByArea(area).filter((p) => p.state === "open");
}

export const POOL_REPORT: PoolReport = {
  poolId: "a-2190",
  completedDate: "8 August",
  slotsSold: 40,
  totalSlots: 40,
  collected: 336000,
  yieldVariancePct: 4.4,
  handovers: 40,
  disputes: 0,
  liveWeightKg: 238.0,
  usableWeightKg: 104.4,
  nominalWeightKg: 100.0,
  varianceLabel: "+4.4%, within ±8%",
  allocationSeed: "a2190-7fd41c",
  seedPublishedDate: "6 August",
  costBreakdown: [
    { label: "Paid to Kuje Livestock Aggregators", amount: 268000 },
    { label: "Haulage, Kuje to hub", amount: 14500 },
    { label: "Hub and butchering, 4 hours", amount: 11000 },
    { label: "Payment processing, 1.5%", amount: 5040 },
    { label: "Shrinkage and yield credits", amount: 9800 },
  ],
  marginAmount: 27660,
  marginPct: 8.2,
  timeline: [
    { at: "28 JUL 09:00", label: "Pool opened, quote held to 6 Aug" },
    { at: "30 JUL 14:20", label: "Threshold of 16 slots passed" },
    { at: "02 AUG 11:05", label: "40 of 40 paid, pool locked" },
    { at: "03 AUG 08:30", label: "PO issued, 40% deposit released" },
    { at: "07 AUG 06:40", label: "Delivered to Kuje hub, QC passed" },
    { at: "08 AUG 09:00", label: "40 handovers, last at 13:12" },
    { at: "09 AUG 10:00", label: "Supplier balance paid, pool completed" },
  ],
};

export const BENEFICIARIES: Beneficiary[] = [
  { index: 1, name: "Tolu Okafor", phone: "0803 441 9022", code: "4471", isPayer: true, status: "named" },
  { index: 2, name: "Aisha Bello", phone: "0812 007 5510", code: "8103", status: "named" },
  { index: 3, name: "Hauwa Ibrahim", phone: "0705 332 8841", code: "2210", status: "named" },
  { index: 4, name: "Ngozi Eze", phone: "0906 118 2043", code: "8845", status: "named" },
  { index: 5, name: "", status: "waiting" },
  { index: 6, name: "", status: "waiting" },
];

export const CREDIT_MOVEMENTS: CreditMovement[] = [
  { label: "Yield shortfall, ram #A-2214", detail: "24 AUG · 2.28kg vs 2.50kg", amount: 740 },
  { label: "Overpayment returned as credit", detail: "11 AUG · sent ₦17,000 for ₦16,800", amount: 200 },
  { label: "Invite credit, Hauwa joined", detail: "02 AUG", amount: 1000 },
  { label: "Spent on beans #A-2185", detail: "21 JUL", amount: -500 },
  { label: "Goodwill, late handover at Karu", detail: "09 JUL · you waited 40 minutes", amount: 500 },
];

export const ROSTER: RosterMember[] = [
  { name: "Hauwa Ibrahim", slots: 2, status: "paid", code: "2210", window: "09:20", windowBooked: true },
  { name: "Ngozi Eze", slots: 1, status: "paid", code: "8845", window: "09:20", windowBooked: true },
  { name: "Blessing Okon", slots: 1, status: "holding", holdExpiresIn: "8:12", windowBooked: false },
  { name: "Fatima Sani", slots: 1, status: "not_started", windowBooked: false },
  { name: "Amina Yusuf", slots: 1, status: "paid_by_coordinator", code: "5023", window: "10:00", windowBooked: true },
  { name: "Grace Adeyemi", slots: 1, status: "paid", code: "7719", windowBooked: false },
  { name: "Zainab Aliyu", slots: 1, status: "paid", code: "3388", windowBooked: false },
];

export const COORDINATOR_POOLS: CoordinatorPoolSummary[] = [
  { title: "Rice 50kg", code: "#A-2231", paid: "12/14", state: "filling", fee: "₦4,200" },
  { title: "Cow", code: "#A-2190", paid: "40/40", state: "completed", fee: "₦11,800 paid" },
  { title: "Beans", code: "#A-2185", paid: "30/30", state: "completed", fee: "₦6,900 paid" },
  { title: "Catfish", code: "#A-2166", paid: "14/50", state: "cancelled", fee: "none" },
];

export const QUOTE_REQUEST: QuoteRequest = {
  id: "qr-1",
  title: "2 head of cattle, 220kg+, delivered to Kuje yard by 21 Aug",
  description:
    "This is demand from two Abuja pools that are already filling. We are not shopping around for fun.",
  expiresIn: "19h 14m",
  lastPrice: 268000,
  depositPct: 40,
  minHoldDays: 7,
};

export const PURCHASE_ORDERS: PurchaseOrder[] = [
  { po: "PO-8859", item: "Cattle ×1", value: 271500, balanceStatus: "due on QC", deposit: 108600 },
  { po: "PO-8841", item: "Cattle ×1", value: 268000, balanceStatus: "paid 11 Aug", deposit: 107200, balance: 160800, settled: "11 Aug, 1.2d" },
  { po: "PO-8802", item: "Ram ×4", value: 196000, balanceStatus: "₦147,000 paid", deposit: 78400, balance: 68600, settled: "short, 1 rejected" },
  { po: "PO-8770", item: "Cattle ×2", value: 524000, balanceStatus: "paid 28 Jul", deposit: 209600, balance: 314400, settled: "28 Jul, 1.6d" },
];

export const DISPUTES: Dispute[] = [
  {
    id: "d-1",
    member: "Grace Adeyemi",
    reason: "Quality, spoiled catfish",
    pool: "#A-2166",
    hub: "Lugbe",
    photos: 2,
    slaRemaining: "4h",
    breaching: true,
    detail:
      "Two of five fish smelled off by the time she got home. Hub log shows her handover at 15:48, near closing, and the cold room was at 6°C rather than 4°C from 14:00.",
  },
  { id: "d-2", member: "Musa Danjuma", reason: "short weight", pool: "A-2190", slaRemaining: "31h left" },
  { id: "d-3", member: "Blessing Okon", reason: "wrong cuts", pool: "A-2185", slaRemaining: "38h left" },
  { id: "d-4", member: "Zainab Aliyu", reason: "nobody at hub", pool: "A-2185", slaRemaining: "12h left" },
];

export const UNMATCHED_TRANSFERS: UnmatchedTransfer[] = [
  {
    amount: 8400,
    receivedAt: "TUE 07:41",
    fromName: "A IBRAHIM · GTB ····4014",
    bankRef: "GTB ···· 9014",
    narration: "\"RAM POOL\"",
    guess: "Aisha Ibrahim, reserved 1 slot in A-2214 at 07:22, hold expired 07:42. Slot still available.",
  },
  {
    amount: 200,
    receivedAt: "MON 19:02",
    fromName: "T OKAFOR",
    bankRef: "STERLING ···· 4402",
    narration: "none",
    guess: "Overpayment on a ₦16,800 commitment already funded. Auto-resolves to credit at 21:00 unless you act.",
  },
  {
    amount: 62000,
    receivedAt: "SAT 11:20",
    fromName: "SUNDAY ENTERPRISES",
    bankRef: "UBA ···· 7781",
    narration: "\"RICE\"",
    guess: "No member, no reservation, no phone number match. Someone was told our account number by a third party. Call before applying anything.",
    urgent: true,
    age: "3 DAYS OLD",
  },
];
