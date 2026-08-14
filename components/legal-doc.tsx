import { SitePage } from "@/components/nav";

export function LegalDoc({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: { heading: string; body: string[] }[];
}) {
  return (
    <SitePage>
      <div className="max-w-[70ch] mx-auto px-5 sm:px-8 py-10">
        <div className="font-mono text-[12px] text-text-dim mb-2">UPDATED {updated}</div>
        <h1 className="font-display text-[36px] sm:text-[44px] tracking-tight leading-none mb-8">
          {title}
        </h1>
        <div className="flex flex-col gap-7">
          {sections.map((s) => (
            <div key={s.heading}>
              <h2 className="text-[19px] font-bold mb-2">{s.heading}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="text-[15.5px] leading-relaxed text-text-mid mb-2">
                  {p}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </SitePage>
  );
}
