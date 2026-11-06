import type { Copy } from './types';

/* ------------------------------------------------------------------------------------------------
   The ONE definition of Sinem CAN's portrait, read by Homepage and Profile alike.

   Source: photograph supplied by the owner (public/images/sinem-can-profile-photo.jpg, a copy of the
   file originally placed at public/sinem-can-profile-photo.jpg). Not fetched from LinkedIn, not
   generated, not stock. Publish only with Sinem's authorisation. Intrinsic size 1152 x 1536 (3:4);
   the 4:5 frame crops ~6% of the height, so the face (~53% / 52% of the frame) is never at risk.
   Set `portrait` to null to fall back to the typographic frame.
   ------------------------------------------------------------------------------------------------ */

export type PortraitSource = {
  src: string;
  width: number;
  height: number;
  focalX: number;
  focalY: number;
  /** crop-in factor around the focal point (source is a full-body frame; 1 = no zoom) */
  zoom: number;
  alt: Copy;
};

export const portrait: PortraitSource | null = {
  src: '/images/sinem-can-profile-photo.jpg',
  width: 1152,
  height: 1536,
  focalX: 55,
  focalY: 50,
  zoom: 1.4,
  alt: {
    tr: 'Sinem CAN, gözlüklü, kısa bordo saçlı, çizgili bluzla, gülümseyerek kameraya bakıyor.',
    en: 'Sinem CAN, wearing glasses and a striped blouse, short burgundy hair, smiling at the camera.',
  },
};
