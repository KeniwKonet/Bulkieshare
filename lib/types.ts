// Core domain types. Money is integer kobo in a real system; here we keep
// naira as plain numbers for display purposes since this is a static UI.

export type PoolState =
  | "draft"
  | "open"
  | "funded"
  | "allocating"
  | "distributing"
  | "completed"
  | "underfilled"
  | "refunding"
  | "cancelled";

export interface Hub {
  id: string;
  name: string;
  area: string;
  address: string;
  landmark: string;
  windows: string;
  capacityPerHour: number;
  notes?: string;
  openPools: number;
}

export interface Pool {
  id: string; // e.g. "a-2214"
  code: string; // e.g. "A-2214"
  area: string;
  hubId: string;
  hubName: string;
  title: string;
  category: "meat" | "grains" | "produce" | "other";
  photoCaption: string;
  description: string;
  unitDescription: string; // "≈2.5kg mixed cuts per slot, ±8%"
  toleranceBand?: string; // "±8%, credited if under"
  totalSlots: number;
  paidSlots: number;
  reservedUnpaidSlots: number;
  threshold: number;
  pricePerSlot: number;
  marketPricePerSlot?: number;
  closesAt: string; // human string for display
  shareDate: string;
  state: PoolState;
  supplier: string;
  cutsBreakdown?: string;
}

export interface PoolReport {
  poolId: string;
  completedDate: string;
  slotsSold: number;
  totalSlots: number;
  collected: number;
  yieldVariancePct: number;
  handovers: number;
  disputes: number;
  liveWeightKg: number;
  usableWeightKg: number;
  nominalWeightKg: number;
  varianceLabel: string;
  allocationSeed: string;
  seedPublishedDate: string;
  costBreakdown: { label: string; amount: number }[];
  marginAmount: number;
  marginPct: number;
  timeline: { at: string; label: string }[];
}

export interface Beneficiary {
  index: number;
  name: string;
  phone?: string;
  code?: string;
  isPayer?: boolean;
  status: "named" | "waiting";
}

export interface CreditMovement {
  label: string;
  detail: string;
  amount: number; // positive = credit, negative = spend
}

export interface RosterMember {
  name: string;
  slots: number;
  status: "paid" | "paid_by_coordinator" | "holding" | "not_started";
  holdExpiresIn?: string;
  code?: string;
  window?: string;
  windowBooked: boolean;
}

export interface CoordinatorPoolSummary {
  title: string;
  code: string;
  paid: string;
  state: string;
  fee: string;
}

export interface QuoteRequest {
  id: string;
  title: string;
  description: string;
  expiresIn: string;
  lastPrice: number;
  depositPct: number;
  minHoldDays: number;
}

export interface PurchaseOrder {
  po: string;
  item: string;
  value: number;
  balanceStatus: string;
  deposit?: number;
  balance?: number;
  settled?: string;
}

export interface Dispute {
  id: string;
  member: string;
  reason: string;
  pool: string;
  slaRemaining: string;
  breaching?: boolean;
  detail?: string;
  hub?: string;
  photos?: number;
}

export interface UnmatchedTransfer {
  amount: number;
  receivedAt: string;
  fromName: string;
  bankRef: string;
  narration: string;
  guess: string;
  urgent?: boolean;
  age?: string;
}
