import { listDisputePhotoKeys } from "@/lib/domain/support";
import { getSignedUrl, storageIsMocked } from "@/lib/providers/storage";

/**
 * Evidence a member attached to a dispute.
 *
 * The bucket is private, so each photo is resolved to a signed URL that expires
 * in five minutes. Deliberately a plain `<img>` rather than `next/image`: the
 * URLs are short-lived and per-request, so putting them through the image
 * optimiser would cache a link that is about to stop working.
 */
export async function DisputePhotos({ disputeId }: { disputeId: string }) {
  const keys = await listDisputePhotoKeys(disputeId);
  if (keys.length === 0) return null;

  if (storageIsMocked()) {
    return (
      <div className="font-mono text-[11.5px] text-text-dim border border-rule px-3 py-2.5 mb-3.5">
        {keys.length} PHOTO{keys.length === 1 ? "" : "S"} ATTACHED · storage is not configured, so
        they cannot be displayed
      </div>
    );
  }

  const urls = (await Promise.all(keys.map((k) => getSignedUrl(k)))).filter(
    (u): u is string => u !== null,
  );

  if (urls.length === 0) return null;

  return (
    <div className="mb-3.5">
      <div className="font-mono text-[11.5px] text-text-dim mb-2">
        {urls.length} PHOTO{urls.length === 1 ? "" : "S"} FROM THE MEMBER
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {urls.map((url, i) => (
          <a key={url} href={url} target="_blank" rel="noreferrer" className="border border-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Dispute evidence ${i + 1}`}
              className="w-full h-[110px] object-cover"
            />
          </a>
        ))}
      </div>
      <p className="font-mono text-[10.5px] text-text-dim mt-1.5">
        Links expire in five minutes and are not public.
      </p>
    </div>
  );
}
