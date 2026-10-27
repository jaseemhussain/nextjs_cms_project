import { updateContentSeo } from "@/db/queries/content.queries";
import { withTransaction } from "@/lib/db/transaction";
import {
  isValidSeoUrl,
  META_DESCRIPTION_MAX,
  META_TITLE_MAX,
  URL_MAX,
} from "@/lib/seo";
import { diffChanges, logActivity } from "@/services/activity.service";
import { ContentError, getAdminContentById } from "@/services/content.service";
import type { ActivityActor } from "@/types/activity";
import type { ContentWithCategories } from "@/types/content";

export type SeoInput = {
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImageUrl?: string | null;
  canonicalUrl?: string | null;
};

const SEO_FIELDS = [
  "meta_title",
  "meta_description",
  "og_image_url",
  "canonical_url",
];

/** Empty string → null, so the public page falls back to title/body/featured image. */
function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function checkLength(value: string | null, max: number, field: string) {
  if (value && value.length > max) {
    throw new ContentError(`${field} must be at most ${max} characters`, 400);
  }
}

function checkUrl(value: string | null, field: string) {
  if (!value) return;
  checkLength(value, URL_MAX, field);
  if (!isValidSeoUrl(value)) {
    throw new ContentError(
      `${field} must be a full http(s) URL or a path starting with /`,
      400
    );
  }
}

export async function updateSeo(
  actor: ActivityActor,
  id: string,
  input: SeoInput
): Promise<ContentWithCategories> {
  const metaTitle = clean(input.metaTitle);
  const metaDescription = clean(input.metaDescription);
  const ogImageUrl = clean(input.ogImageUrl);
  const canonicalUrl = clean(input.canonicalUrl);

  checkLength(metaTitle, META_TITLE_MAX, "Meta title");
  checkLength(metaDescription, META_DESCRIPTION_MAX, "Meta description");
  checkUrl(ogImageUrl, "OG image URL");
  checkUrl(canonicalUrl, "Canonical URL");

  return withTransaction(async () => {
    const before = await getAdminContentById(id);

    await updateContentSeo(id, {
      metaTitle,
      metaDescription,
      ogImageUrl,
      canonicalUrl,
    });

    const after = await getAdminContentById(id);
    const changes = diffChanges(before, after, SEO_FIELDS);

    if (changes) {
      await logActivity(actor, {
        action: "content.seo_update",
        entityType: "content",
        entityId: id,
        entityLabel: after.title,
        changes,
      });
    }

    return after;
  });
}
