"use client";

import { useState } from "react";

export function Accordion({
  items,
}: {
  items: { q: string; a: string }[];
}) {
  const [open, setOpen] = useState(0);
  return (
    <div className="flex flex-col">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.q} className={isOpen ? "bg-card -mx-5 sm:-mx-8 px-5 sm:px-8" : ""}>
            <button
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="w-full flex justify-between items-start gap-4 py-3.5 border-b border-rule text-left"
            >
              <span className="text-[16px] font-semibold">{it.q}</span>
              <span className="font-mono text-[18px] flex-shrink-0">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && (
              <p className="pb-4 pt-2 text-[15px] leading-relaxed text-text-dim max-w-[60ch]">
                {it.a}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
