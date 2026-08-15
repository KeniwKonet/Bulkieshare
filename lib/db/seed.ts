import { eq } from "drizzle-orm";

import { nairaToKobo } from "../money";
import { addDays, addHours } from "../time";
import type { Db } from "./index";
import * as s from "./schema";

/**
 * Seeds a fresh database with the launch dataset: Abuja live with four hubs,
 * eight pools across every lifecycle state, and one demo member per role so
 * every screen in the app has something real to render.
 *
 * Dates are relative to seed time, so a pool that is meant to be open is
 * always open no matter when you run this.
 */

const N = nairaToKobo;

/** Demo phone numbers. Any of these can sign in; see `lib/auth/otp.ts`. */
export const DEMO_PHONES = {
  member: "+2348034419022", // Tolu Okafor
  coordinator: "+2348120075510", // Aisha Bello
  hubAgent: "+2347053328841", // Hauwa Ibrahim
  supplier: "+2349061182043", // Ngozi Eze
  ops: "+2348030000001", // Ops desk
} as const;

const FILLER_NAMES = [
  "Chidi Nwosu", "Yemi Adebayo", "Sadiq Bala", "Ifeoma Obi", "Kunle Ajayi",
  "Halima Sule", "Emeka Duru", "Bisi Ogunleye", "Nasir Garba", "Uche Nnamdi",
  "Folake Ade", "Ibrahim Musa", "Chioma Eze", "Tunde Bakare", "Rukayat Lawal",
  "Segun Oyelaran", "Maryam Abubakar", "Obinna Okeke", "Titi Balogun", "Danladi Yaro",
  "Nkechi Udo", "Abdul Kareem", "Lola Shonibare", "Peter Agu", "Zara Mohammed",
  "Femi Coker", "Aminu Tanko", "Gloria Etim", "Sola Adeniyi", "Hadiza Bello",
  "Victor Aniekan", "Kemi Falade", "Bashir Umar", "Ada Okonkwo", "Wale Idris",
  "Salamatu Isa", "Chinedu Ike", "Ronke Fashola", "Idris Suleiman", "Ngozi Amadi",
];

export async function seed(db: Db): Promise<void> {
  const now = new Date();

  /* ---------------------------------------------------------------- */
  /* Areas and hubs                                                    */
  /* ---------------------------------------------------------------- */

  await db.insert(s.areas).values([
    { slug: "abuja", label: "Abuja", isLive: true },
    { slug: "lagos", label: "Lagos", isLive: false, waitlistCount: 412 },
  ]);

  await db.insert(s.hubs).values([
    {
      id: "wuse",
      areaSlug: "abuja",
      name: "Wuse II hub",
      address: "12 Aminu Kano Crescent, Wuse II",
      landmark: "Behind the Total filling station",
      windows: "Sat and Sun, 09:00 to 15:00",
      capacityPerHour: 30,
      notes: "30 handovers an hour",
    },
    {
      id: "lugbe",
      areaSlug: "abuja",
      name: "Lugbe hub",
      address: "Lugbe access road, by the NNPC filling station",
      landmark: "Cold room on site",
      windows: "Sun only, 10:00 to 16:00",
      capacityPerHour: 20,
      notes: "Cold room on site",
    },
    {
      id: "karu",
      areaSlug: "abuja",
      name: "Karu hub",
      address: "Karu market road, dry goods store 4",
      landmark: "Dry goods only",
      windows: "Sat, 09:00 to 13:00",
      capacityPerHour: 25,
      notes: "Dry goods only",
    },
    {
      id: "kuje",
      areaSlug: "abuja",
      name: "Kuje hub",
      address: "Green gate opposite the mosque, Kuje market road",
      landmark: "Green gate opposite the mosque",
      windows: "Sat, 08:00 to 14:00",
      capacityPerHour: 30,
      notes: "Butchering on site",
    },
  ]);

  /* ---------------------------------------------------------------- */
  /* Suppliers                                                         */
  /* ---------------------------------------------------------------- */

  const suppliers = await db
    .insert(s.suppliers)
    .values([
      {
        name: "Gwagwalada Livestock Aggregators",
        contactName: "Sani Gwagwalada",
        contactPhone: "+2348055512001",
        bankName: "GTBank",
        bankAccountNumber: "0123456789",
        bankAccountName: "Gwagwalada Livestock Aggregators Ltd",
        ordersDelivered: 9,
        yieldAccuracyPct: 97,
        onTimePct: 94,
        rejectRatePct: 2,
        isApproved: true,
        whatsappOptIn: true,
      },
      {
        name: "Karu Grains",
        contactName: "Ladi Karu",
        contactPhone: "+2348055512002",
        bankName: "UBA",
        bankAccountNumber: "2233445566",
        bankAccountName: "Karu Grains Enterprises",
        ordersDelivered: 14,
        yieldAccuracyPct: 99,
        onTimePct: 97,
        rejectRatePct: 1,
        isApproved: true,
      },
      {
        name: "Gwagwalada Aquaculture",
        contactName: "Bright Eze",
        contactPhone: "+2348055512003",
        bankName: "Sterling",
        bankAccountNumber: "3344556677",
        bankAccountName: "Gwagwalada Aquaculture",
        ordersDelivered: 6,
        yieldAccuracyPct: 91,
        onTimePct: 88,
        rejectRatePct: 6,
        isApproved: true,
      },
      {
        name: "Kogi Palm Millers Cooperative",
        contactName: "Ojo Adamu",
        contactPhone: "+2348055512004",
        bankName: "Zenith",
        bankAccountNumber: "4455667788",
        bankAccountName: "Kogi Palm Millers Coop",
        ordersDelivered: 4,
        yieldAccuracyPct: 96,
        onTimePct: 92,
        rejectRatePct: 3,
        isApproved: true,
      },
      {
        name: "Kuje Livestock Aggregators",
        contactName: "Musa Kuje",
        contactPhone: "+2348055512005",
        bankName: "Access",
        bankAccountNumber: "5566778899",
        bankAccountName: "Kuje Livestock Aggregators",
        ordersDelivered: 11,
        yieldAccuracyPct: 95,
        onTimePct: 90,
        rejectRatePct: 4,
        isApproved: true,
      },
    ])
    .returning({ id: s.suppliers.id, name: s.suppliers.name });

  const supplierId = (name: string) => suppliers.find((x) => x.name === name)!.id;

  /* ---------------------------------------------------------------- */
  /* Members                                                           */
  /* ---------------------------------------------------------------- */

  const namedMembers = [
    { phone: DEMO_PHONES.member, name: "Tolu Okafor", role: "member" as const, homeHubId: "lugbe", creditKobo: N(1940) },
    { phone: DEMO_PHONES.coordinator, name: "Aisha Bello", role: "coordinator" as const, homeHubId: "karu" },
    { phone: DEMO_PHONES.hubAgent, name: "Hauwa Ibrahim", role: "hub_agent" as const, homeHubId: "lugbe" },
    { phone: DEMO_PHONES.supplier, name: "Ngozi Eze", role: "supplier" as const, supplierId: supplierId("Gwagwalada Livestock Aggregators") },
    { phone: DEMO_PHONES.ops, name: "Ops desk", role: "ops" as const },
    { phone: "+2348051119001", name: "Blessing Okon", role: "member" as const, homeHubId: "karu" },
    { phone: "+2348051119002", name: "Fatima Sani", role: "member" as const, homeHubId: "karu" },
    { phone: "+2348051119003", name: "Amina Yusuf", role: "member" as const, homeHubId: "karu" },
    { phone: "+2348051119004", name: "Grace Adeyemi", role: "member" as const, homeHubId: "lugbe" },
    { phone: "+2348051119005", name: "Zainab Aliyu", role: "member" as const, homeHubId: "karu" },
    { phone: "+2348051119006", name: "Musa Danjuma", role: "member" as const, homeHubId: "kuje" },
  ];

  const fillerMembers = FILLER_NAMES.map((name, i) => ({
    phone: `+23480522${String(10000 + i).slice(-5)}`,
    name,
    role: "member" as const,
    homeHubId: ["wuse", "lugbe", "karu", "kuje"][i % 4],
  }));

  const members = await db
    .insert(s.members)
    .values(
      [...namedMembers, ...fillerMembers].map((m) => ({
        ...m,
        areaSlug: "abuja",
        lastSeenAt: now,
      })),
    )
    .returning({ id: s.members.id, name: s.members.name, phone: s.members.phone });

  const memberByName = (name: string) => members.find((m) => m.name === name)!;
  const fillerPool = members.filter((m) => FILLER_NAMES.includes(m.name));

  /* ---------------------------------------------------------------- */
  /* Coordinator group                                                 */
  /* ---------------------------------------------------------------- */

  const [group] = await db
    .insert(s.groups)
    .values({
      slug: "karu-estate",
      name: "Karu Estate Residents",
      areaSlug: "abuja",
      hubId: "karu",
      coordinatorId: memberByName("Aisha Bello").id,
      feePctBasisPoints: 300,
    })
    .returning({ id: s.groups.id });

  await db.insert(s.groupMembers).values(
    [
      memberByName("Blessing Okon"),
      memberByName("Fatima Sani"),
      memberByName("Amina Yusuf"),
      memberByName("Zainab Aliyu"),
      memberByName("Grace Adeyemi"),
      ...fillerPool.slice(0, 18),
    ].map((m) => ({ groupId: group.id, memberId: m.id })),
  );

  /* ---------------------------------------------------------------- */
  /* Pools                                                             */
  /* ---------------------------------------------------------------- */

  const poolRows = [
    {
      id: "a-2214",
      code: "A-2214",
      hubId: "lugbe",
      supplierId: supplierId("Gwagwalada Livestock Aggregators"),
      title: "Live ram, medium",
      category: "meat" as const,
      photoCaption: "the actual ram, shot by our field agent at Gwagwalada",
      description:
        "One ram of 55kg to 62kg live weight, split forty ways after butchering at the hub. Each slot is roughly 2.5kg of mixed cuts. Supplied by Gwagwalada Livestock Aggregators, who have delivered nine orders to us with a 97% yield accuracy score.",
      unitDescription: "≈2.5kg mixed cuts per slot, ±8%",
      toleranceBand: "±8%, credited if under",
      cutsBreakdown: "40% prime, 40% secondary, 20% trim",
      totalSlots: 40,
      threshold: 16,
      pricePerSlotKobo: N(8400),
      marketPricePerSlotKobo: N(10900),
      state: "open" as const,
      closesAt: addDays(now, 3),
      shareDate: addDays(now, 9),
      paid: 36,
      holding: 3,
    },
    {
      id: "a-2231",
      code: "A-2231",
      hubId: "karu",
      supplierId: supplierId("Karu Grains"),
      groupId: group.id,
      title: "Rice, 50kg bag",
      category: "grains" as const,
      photoCaption: "stacked rice bags",
      description:
        "One whole 50kg bag of long grain rice per slot, sourced from Karu Grains. Exact weight, no tolerance band, because rice does not shrink between the mill and the hub the way meat does.",
      unitDescription: "One whole bag per slot. Exact weight, no tolerance band.",
      totalSlots: 14,
      threshold: 12,
      pricePerSlotKobo: N(62000),
      state: "open" as const,
      closesAt: addDays(now, 2),
      shareDate: addDays(now, 8),
      paid: 12,
      holding: 0,
    },
    {
      id: "a-2240",
      code: "A-2240",
      hubId: "wuse",
      supplierId: supplierId("Gwagwalada Aquaculture"),
      title: "Catfish, live",
      category: "meat" as const,
      photoCaption: "live catfish pond",
      description:
        "5 pieces per slot, 1.2kg average each, from a pond at Gwagwalada. Killed and cleaned at the hub on request.",
      unitDescription: "5 pieces per slot, 1.2kg average each",
      totalSlots: 50,
      threshold: 40,
      pricePerSlotKobo: N(11500),
      state: "open" as const,
      closesAt: addDays(now, 6),
      shareDate: addDays(now, 10),
      paid: 19,
      holding: 0,
    },
    {
      id: "a-2244",
      code: "A-2244",
      hubId: "wuse",
      supplierId: supplierId("Kogi Palm Millers Cooperative"),
      title: "Palm oil, 5 litres",
      category: "produce" as const,
      photoCaption: "palm oil kegs",
      description:
        "5 litre keg of unrefined palm oil per slot, sourced direct from a mill in Kogi.",
      unitDescription: "One 5 litre keg per slot",
      totalSlots: 80,
      threshold: 50,
      pricePerSlotKobo: N(9200),
      state: "open" as const,
      closesAt: addDays(now, 1),
      shareDate: addDays(now, 8),
      paid: 36,
      holding: 0,
    },
    {
      id: "a-2190",
      code: "A-2190",
      hubId: "kuje",
      supplierId: supplierId("Kuje Livestock Aggregators"),
      title: "Cow, Kuje aggregator",
      category: "meat" as const,
      photoCaption: "the cow at intake, Kuje yard",
      description:
        "One cow split forty ways after butchering at Kuje hub. Supplied by Kuje Livestock Aggregators.",
      unitDescription: "≈2.5kg mixed cuts per slot, ±8%",
      toleranceBand: "±8%, credited if under",
      cutsBreakdown: "40% prime, 40% secondary, 20% trim",
      totalSlots: 40,
      threshold: 16,
      pricePerSlotKobo: N(8400),
      state: "completed" as const,
      closesAt: addDays(now, -8),
      shareDate: addDays(now, -6),
      allocationSeed: "a2190-7fd41c",
      seedPublishedAt: addDays(now, -8),
      paid: 40,
      holding: 0,
    },
    {
      id: "a-2185",
      code: "A-2185",
      hubId: "karu",
      supplierId: supplierId("Karu Grains"),
      groupId: group.id,
      title: "Beans, 100kg bag",
      category: "grains" as const,
      photoCaption: "sacks of brown beans",
      description: "100kg bag of brown beans split into 30 slots.",
      unitDescription: "≈3.3kg per slot",
      totalSlots: 30,
      threshold: 15,
      pricePerSlotKobo: N(6900),
      state: "completed" as const,
      closesAt: addDays(now, -26),
      shareDate: addDays(now, -24),
      allocationSeed: "a2185-31be08",
      seedPublishedAt: addDays(now, -26),
      paid: 30,
      holding: 0,
    },
    {
      id: "a-2226",
      code: "A-2226",
      hubId: "wuse",
      supplierId: supplierId("Gwagwalada Aquaculture"),
      title: "Catfish, live",
      category: "meat" as const,
      photoCaption: "live catfish pond",
      description:
        "5 pieces per slot. This pool did not reach its threshold and was cancelled.",
      unitDescription: "5 pieces per slot, 1.2kg average each",
      totalSlots: 50,
      threshold: 40,
      pricePerSlotKobo: N(11500),
      state: "underfilled" as const,
      closesAt: addDays(now, -10),
      shareDate: addDays(now, -6),
      paid: 19,
      holding: 0,
    },
    {
      id: "a-2166",
      code: "A-2166",
      hubId: "lugbe",
      supplierId: supplierId("Gwagwalada Aquaculture"),
      title: "Catfish, live",
      category: "meat" as const,
      photoCaption: "live catfish pond",
      description: "Completed pool with one open quality dispute.",
      unitDescription: "5 pieces per slot, 1.2kg average each",
      totalSlots: 50,
      threshold: 40,
      pricePerSlotKobo: N(11500),
      state: "completed" as const,
      closesAt: addDays(now, -12),
      shareDate: addDays(now, -10),
      allocationSeed: "a2166-c40aa2",
      seedPublishedAt: addDays(now, -12),
      paid: 50,
      holding: 0,
    },
  ];

  // `paid` and `holding` drive the commitment loop below; they are not columns.
  await db.insert(s.pools).values(
    poolRows.map((row) => {
      const { paid, holding, ...pool } = row;
      void paid;
      void holding;
      return { ...pool, areaSlug: "abuja" };
    }),
  );

  /* ---------------------------------------------------------------- */
  /* Commitments — one per paid slot group, summing to each pool's paid */
  /* ---------------------------------------------------------------- */

  let fillerCursor = 0;
  const nextFiller = () => fillerPool[fillerCursor++ % fillerPool.length];

  /** Members who should visibly own slots in specific pools, for the demo. */
  const anchors: Record<string, { name: string; slots: number }[]> = {
    "a-2214": [
      { name: "Tolu Okafor", slots: 2 },
      { name: "Hauwa Ibrahim", slots: 2 },
      { name: "Grace Adeyemi", slots: 1 },
    ],
    "a-2231": [
      { name: "Hauwa Ibrahim", slots: 2 },
      { name: "Ngozi Eze", slots: 1 },
      { name: "Amina Yusuf", slots: 1 },
      { name: "Grace Adeyemi", slots: 1 },
      { name: "Zainab Aliyu", slots: 1 },
    ],
    "a-2190": [
      { name: "Tolu Okafor", slots: 1 },
      { name: "Musa Danjuma", slots: 2 },
    ],
    "a-2185": [
      { name: "Tolu Okafor", slots: 1 },
      { name: "Blessing Okon", slots: 1 },
      { name: "Zainab Aliyu", slots: 1 },
    ],
    "a-2166": [
      { name: "Grace Adeyemi", slots: 1 },
      { name: "Tolu Okafor", slots: 1 },
    ],
    "a-2226": [{ name: "Tolu Okafor", slots: 1 }],
  };

  for (const pool of poolRows) {
    const isPast = pool.state !== "open";
    let remaining = pool.paid;

    const planned: { memberId: string; slots: number; byCoordinator: boolean }[] = [];

    for (const anchor of anchors[pool.id] ?? []) {
      if (remaining <= 0) break;
      const slots = Math.min(anchor.slots, remaining);
      planned.push({ memberId: memberByName(anchor.name).id, slots, byCoordinator: false });
      remaining -= slots;
    }
    // Amina Yusuf's slot in the coordinator's pool was paid on her behalf.
    if (pool.id === "a-2231") {
      const amina = planned.find((p) => p.memberId === memberByName("Amina Yusuf").id);
      if (amina) amina.byCoordinator = true;
    }
    while (remaining > 0) {
      const slots = Math.min(remaining, 1);
      planned.push({ memberId: nextFiller().id, slots, byCoordinator: false });
      remaining -= slots;
    }

    for (const [i, p] of planned.entries()) {
      const paidAt = new Date(pool.closesAt.getTime() - (planned.length - i) * 3_600_000);
      const [reservation] = await db
        .insert(s.reservations)
        .values({
          reference: `${pool.id}-r${(i + 1).toString(36)}${Math.floor(Math.random() * 900 + 100)}`,
          poolId: pool.id,
          memberId: p.memberId,
          slots: p.slots,
          subtotalKobo: pool.pricePerSlotKobo * p.slots,
          creditAppliedKobo: 0,
          amountDueKobo: pool.pricePerSlotKobo * p.slots,
          state: "paid",
          expiresAt: new Date(paidAt.getTime() + 20 * 60_000),
          createdAt: paidAt,
        })
        .returning({ id: s.reservations.id });

      const [commitment] = await db
        .insert(s.commitments)
        .values({
          poolId: pool.id,
          memberId: p.memberId,
          reservationId: reservation.id,
          slots: p.slots,
          paidKobo: pool.pricePerSlotKobo * p.slots,
          state: isPast ? (pool.state === "underfilled" ? "refunded" : "collected") : "funded",
          paidByCoordinator: p.byCoordinator,
          collectionCode: String(Math.floor(Math.random() * 9000) + 1000),
          windowAt: isPast ? pool.shareDate : i % 3 === 0 ? addHours(pool.shareDate, 1) : null,
          createdAt: paidAt,
        })
        .returning({ id: s.commitments.id });

      await db.insert(s.payments).values({
        reference: `pay_${reservation.id.slice(0, 8)}`,
        reservationId: reservation.id,
        memberId: p.memberId,
        amountKobo: pool.pricePerSlotKobo * p.slots,
        method: p.byCoordinator ? "coordinator" : "transfer",
        state: "succeeded",
        provider: "seed",
        settledAt: paidAt,
        createdAt: paidAt,
      });

      // Name the first slot after the payer; the rest stay open to be named.
      await db.insert(s.beneficiaries).values(
        Array.from({ length: p.slots }, (_, slotIndex) => ({
          commitmentId: commitment.id,
          slotIndex: slotIndex + 1,
          name: slotIndex === 0 ? members.find((m) => m.id === p.memberId)!.name : "",
          phone: slotIndex === 0 ? members.find((m) => m.id === p.memberId)!.phone : null,
          code: String(Math.floor(Math.random() * 9000) + 1000),
          isPayer: slotIndex === 0,
        })),
      );

      if (isPast && pool.state === "completed") {
        await db.insert(s.handovers).values({
          commitmentId: commitment.id,
          hubId: pool.hubId,
          agentId: memberByName("Hauwa Ibrahim").id,
          weightGrams: 2400 + Math.floor(Math.random() * 250),
          handedOverAt: addHours(pool.shareDate, 1 + (i % 5)),
        });
      }
    }

    // Live holds on the ram pool, so the reserved-unpaid band has something in it.
    for (let i = 0; i < pool.holding; i++) {
      const member = nextFiller();
      await db.insert(s.reservations).values({
        reference: `${pool.id}-h${i + 1}${Math.floor(Math.random() * 900 + 100)}`,
        poolId: pool.id,
        memberId: member.id,
        slots: 1,
        subtotalKobo: pool.pricePerSlotKobo,
        creditAppliedKobo: 0,
        amountDueKobo: pool.pricePerSlotKobo,
        state: "holding",
        expiresAt: addHours(now, 0.2 + i * 0.05),
        createdAt: now,
      });
    }
  }

  /* ---------------------------------------------------------------- */
  /* Pool timeline + settlement report for the completed cow pool      */
  /* ---------------------------------------------------------------- */

  await db.insert(s.poolEvents).values([
    { poolId: "a-2190", label: "Pool opened, quote held to share date", at: addDays(now, -19) },
    { poolId: "a-2190", label: "Threshold of 16 slots passed", at: addDays(now, -17) },
    { poolId: "a-2190", label: "40 of 40 paid, pool locked", at: addDays(now, -13) },
    { poolId: "a-2190", label: "PO issued, 40% deposit released", at: addDays(now, -12) },
    { poolId: "a-2190", label: "Delivered to Kuje hub, QC passed", at: addDays(now, -7) },
    { poolId: "a-2190", label: "40 handovers, last at 13:12", at: addDays(now, -6) },
    { poolId: "a-2190", label: "Supplier balance paid, pool completed", at: addDays(now, -5) },
    { poolId: "a-2214", label: "Pool opened", at: addDays(now, -4) },
    { poolId: "a-2214", label: "Threshold of 16 slots passed", at: addDays(now, -2) },
  ]);

  await db.insert(s.poolReports).values({
    poolId: "a-2190",
    completedAt: addDays(now, -5),
    collectedKobo: N(336000),
    liveWeightGrams: 238_000,
    usableWeightGrams: 104_400,
    nominalWeightGrams: 100_000,
    yieldVarianceBasisPoints: 440,
    handovers: 40,
    disputes: 0,
    costBreakdown: [
      { label: "Paid to Kuje Livestock Aggregators", amountKobo: N(268000) },
      { label: "Haulage, Kuje to hub", amountKobo: N(14500) },
      { label: "Hub and butchering, 4 hours", amountKobo: N(11000) },
      { label: "Payment processing, 1.5%", amountKobo: N(5040) },
      { label: "Shrinkage and yield credits", amountKobo: N(9800) },
    ],
    marginKobo: N(27660),
  });

  /* ---------------------------------------------------------------- */
  /* Store credit for the demo member                                  */
  /* ---------------------------------------------------------------- */

  const tolu = memberByName("Tolu Okafor");
  await db.insert(s.creditMovements).values([
    { memberId: tolu.id, label: "Yield shortfall, ram #A-2214", detail: "2.28kg vs 2.50kg", amountKobo: N(740), poolId: "a-2214", createdAt: addDays(now, -3) },
    { memberId: tolu.id, label: "Overpayment returned as credit", detail: "sent ₦17,000 for ₦16,800", amountKobo: N(200), createdAt: addDays(now, -6) },
    { memberId: tolu.id, label: "Invite credit, Hauwa joined", detail: "", amountKobo: N(1000), createdAt: addDays(now, -15) },
    { memberId: tolu.id, label: "Spent on beans #A-2185", detail: "", amountKobo: N(-500), poolId: "a-2185", createdAt: addDays(now, -24) },
    { memberId: tolu.id, label: "Goodwill, late handover at Karu", detail: "you waited 40 minutes", amountKobo: N(500), createdAt: addDays(now, -36) },
  ]);

  /* ---------------------------------------------------------------- */
  /* Disputes                                                          */
  /* ---------------------------------------------------------------- */

  const graceCommitment = await db.query.commitments.findFirst({
    where: (c, { and, eq: e }) =>
      and(e(c.poolId, "a-2166"), e(c.memberId, memberByName("Grace Adeyemi").id)),
  });

  await db.insert(s.disputes).values([
    {
      reference: "D-4471",
      memberId: memberByName("Grace Adeyemi").id,
      commitmentId: graceCommitment?.id,
      poolId: "a-2166",
      reason: "quality",
      detail:
        "Two of five fish smelled off by the time she got home. Hub log shows her handover at 15:48, near closing, and the cold room was at 6°C rather than 4°C from 14:00.",
      state: "investigating",
      slaDueAt: addHours(now, 4),
      createdAt: addHours(now, -44),
    },
    {
      reference: "D-4472",
      memberId: memberByName("Musa Danjuma").id,
      poolId: "a-2190",
      reason: "short_weight",
      detail: "Weighed 2.21kg at home against a 2.50kg nominal slot.",
      state: "open",
      slaDueAt: addHours(now, 31),
      createdAt: addHours(now, -17),
    },
    {
      reference: "D-4473",
      memberId: memberByName("Blessing Okon").id,
      poolId: "a-2185",
      reason: "wrong_cuts",
      detail: "Received mostly trim where the split promised 40% prime.",
      state: "open",
      slaDueAt: addHours(now, 38),
      createdAt: addHours(now, -10),
    },
    {
      reference: "D-4474",
      memberId: memberByName("Zainab Aliyu").id,
      poolId: "a-2185",
      reason: "no_handover",
      detail: "Arrived inside the window and nobody was at the hub.",
      state: "open",
      slaDueAt: addHours(now, 12),
      createdAt: addHours(now, -36),
    },
  ]);

  /* ---------------------------------------------------------------- */
  /* Refunds for the underfilled pool                                  */
  /* ---------------------------------------------------------------- */

  const underfilled = await db.query.commitments.findMany({
    where: (c, { eq: e }) => e(c.poolId, "a-2226"),
  });

  // Every commitment in the cancelled pool is marked refunded above, so every
  // one of them needs a matching refund row or the ops ledger will not balance.
  await db.insert(s.refunds).values(
    underfilled.map((c, i) => ({
      reference: `R-${8100 + i}`,
      memberId: c.memberId,
      commitmentId: c.id,
      poolId: "a-2226",
      amountKobo: c.paidKobo,
      method: "bank" as const,
      // Most are settled; a few are still moving, which is what ops works on.
      state: i < underfilled.length - 4 ? ("paid" as const) : ("processing" as const),
      reason: "Pool did not reach its threshold and was cancelled.",
      dueAt: addDays(now, -8),
      paidAt: i < underfilled.length - 4 ? addDays(now, -9) : null,
      createdAt: addDays(now, -10),
    })),
  );

  /* ---------------------------------------------------------------- */
  /* Supply side                                                       */
  /* ---------------------------------------------------------------- */

  await db.insert(s.quoteRequests).values({
    title: "2 head of cattle, 220kg+, delivered to Kuje yard",
    description:
      "This is demand from two Abuja pools that are already filling. We are not shopping around for fun.",
    areaSlug: "abuja",
    hubId: "kuje",
    lastPriceKobo: N(268000),
    depositPct: 40,
    minHoldDays: 7,
    state: "open",
    expiresAt: addHours(now, 19),
  });

  await db.insert(s.purchaseOrders).values([
    { po: "PO-8859", supplierId: supplierId("Kuje Livestock Aggregators"), item: "Cattle ×1", valueKobo: N(271500), depositKobo: N(108600), balanceKobo: N(162900), state: "delivered", createdAt: addDays(now, -3) },
    { po: "PO-8841", supplierId: supplierId("Kuje Livestock Aggregators"), poolId: "a-2190", item: "Cattle ×1", valueKobo: N(268000), depositKobo: N(107200), balanceKobo: N(160800), state: "settled", deliveredAt: addDays(now, -7), settledAt: addDays(now, -5), createdAt: addDays(now, -12) },
    { po: "PO-8802", supplierId: supplierId("Gwagwalada Livestock Aggregators"), item: "Ram ×4", valueKobo: N(196000), depositKobo: N(78400), balanceKobo: N(68600), state: "qc_failed", qcNote: "1 of 4 rejected at QC, balance paid short", createdAt: addDays(now, -18) },
    { po: "PO-8770", supplierId: supplierId("Kuje Livestock Aggregators"), item: "Cattle ×2", valueKobo: N(524000), depositKobo: N(209600), balanceKobo: N(314400), state: "settled", deliveredAt: addDays(now, -20), settledAt: addDays(now, -18), createdAt: addDays(now, -26) },
  ]);

  const settledPos = await db.query.purchaseOrders.findMany({
    where: (p, { eq: e }) => e(p.state, "settled"),
  });
  if (settledPos.length) {
    await db.insert(s.supplierPayouts).values(
      settledPos.map((po) => ({
        supplierId: po.supplierId,
        purchaseOrderId: po.id,
        amountKobo: po.balanceKobo,
        state: "paid" as const,
        paidAt: po.settledAt,
      })),
    );
  }

  /* ---------------------------------------------------------------- */
  /* Ops: unmatched bank credits                                       */
  /* ---------------------------------------------------------------- */

  await db.insert(s.unmatchedTransfers).values([
    {
      amountKobo: N(8400),
      fromName: "A IBRAHIM · GTB ····4014",
      bankRef: "GTB ···· 9014",
      narration: "RAM POOL",
      guess:
        "Aisha Ibrahim, reserved 1 slot in A-2214, hold expired 20 minutes later. Slot still available.",
      state: "unmatched",
      receivedAt: addHours(now, -6),
    },
    {
      amountKobo: N(200),
      fromName: "T OKAFOR",
      bankRef: "STERLING ···· 4402",
      narration: "",
      guess:
        "Overpayment on a ₦16,800 commitment already funded. Auto-resolves to credit unless you act.",
      state: "unmatched",
      receivedAt: addHours(now, -20),
    },
    {
      amountKobo: N(62000),
      fromName: "SUNDAY ENTERPRISES",
      bankRef: "UBA ···· 7781",
      narration: "RICE",
      guess:
        "No member, no reservation, no phone number match. Someone was told our account number by a third party. Call before applying anything.",
      state: "escalated",
      receivedAt: addDays(now, -3),
    },
  ]);

  /* ---------------------------------------------------------------- */
  /* Audit trail                                                       */
  /* ---------------------------------------------------------------- */

  await db.insert(s.auditEvents).values([
    { actorLabel: "Ops desk", action: "pool.opened", subject: "a-2214", at: addDays(now, -4) },
    { actorLabel: "Ops desk", action: "po.issued", subject: "PO-8859", at: addDays(now, -3) },
    { actorLabel: "Hauwa Ibrahim", action: "handover.batch", subject: "a-2190", detail: { count: 40 }, at: addDays(now, -6) },
    { actorLabel: "system", action: "pool.completed", subject: "a-2190", at: addDays(now, -5) },
  ]);

  await db.insert(s.waitlist).values([
    { phone: "+2348090000001", areaSlug: "lagos", neighbourhood: "Yaba" },
    { phone: "+2348090000002", areaSlug: "lagos", neighbourhood: "Surulere" },
  ]);

  // Keep the running credit balance in step with the ledger we just wrote.
  const ledger = await db.query.creditMovements.findMany({
    where: (c, { eq: e }) => e(c.memberId, tolu.id),
  });
  await db
    .update(s.members)
    .set({ creditKobo: ledger.reduce((sum, m) => sum + m.amountKobo, 0) })
    .where(eq(s.members.id, tolu.id));
}
