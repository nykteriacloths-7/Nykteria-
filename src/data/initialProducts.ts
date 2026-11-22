import { Product, UpcomingReleaseSlot } from '../types';

export const HERO_EDITORIAL_IMAGE = '/src/assets/images/hero_nykteria_editorial_1795359368988.jpg';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'nyx-piece-01-hoodie',
    releaseNumber: 'Piece 01',
    name: 'NYKTERIA Sigil & Fallen Wing Heavyweight Hoodie',
    shortName: 'Sigil & Fallen Wing Hoodie',
    category: 'Heavyweight Oversized Hoodie',
    priceInr: 2499,
    discountEnabled: false,
    discountPercent: 15,
    promoLabel: 'First Release Offer',
    frontSummary:
      'Washed charcoal-black heavyweight silhouette anchored by a sharp bone-silver gothic cross and intertwined thorn sigil across the chest.',
    backSummary:
      'Full-back fallen winged angel engraving printed in archival bone and muted ash-violet highlights, built to age naturally with every wash.',
    editorialNote:
      'Cut with a structured drop-shoulder and wide boxy torso from 480 GSM enzyme-washed cotton fleece. Double-layered hood with zero drawstring clutter.',
    frontImage: '/src/assets/images/hoodie_front_sigil_1795359368282.jpg',
    backImage: '/src/assets/images/hoodie_back_angel_1795359368525.jpg',
    sizes: {
      S: true,
      M: true,
      L: true,
      XL: true,
    },
    specs: {
      weight: '480 GSM Heavyweight Fleece',
      silhouette: 'Boxy Oversized Drop-Shoulder',
      fabric: '100% Combed Ring-Spun Cotton, Enzyme Charcoal Wash',
      artworkMethod: 'High-Density Discharge & Multi-Layer Plastisol Screenprint',
      care: [
        'Machine wash cold (30°C) inside out with gentle detergent',
        'Do not bleach, tumble dry, or dry clean',
        'Hang dry in shade to preserve charcoal pigment wash',
        'Iron inside out on low heat; never iron directly over sigil or back print',
      ],
    },
    createdAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'nyx-piece-02-tee',
    releaseNumber: 'Piece 02',
    name: 'NYKTERIA Gothic Wordmark & Twin Skull Oversized Tee',
    shortName: 'Gothic Wordmark & Twin Skull Tee',
    category: 'Oversized Streetwear Tee',
    priceInr: 1299,
    discountEnabled: false,
    discountPercent: 10,
    promoLabel: 'Launch Allocation',
    frontSummary:
      'Washed charcoal-black boxy tee featuring the jagged NYKTERIA gothic wordmark screenprinted across the upper chest in distressed bone ink.',
    backSummary:
      'Twin horned skulls bound in dark thorns with subtle ash-violet sigil geometry framing the rear shoulder blades.',
    editorialNote:
      'Tailored with an architectural boxy drape, thick 1.2-inch ribbed mock-neck collar, and elongated drop sleeves in 280 GSM combed jersey.',
    frontImage: '/src/assets/images/tee_front_wordmark_1795359368804.jpg',
    backImage: '/src/assets/images/tee_back_skulls_1795359368790.jpg',
    sizes: {
      S: true,
      M: true,
      L: true,
      XL: true,
    },
    specs: {
      weight: '280 GSM Heavy Combed Jersey',
      silhouette: 'Relaxed Boxy Streetwear Drape',
      fabric: '100% Heavyweight Cotton, Pigment Charcoal Wash',
      artworkMethod: 'Soft-Hand Crackle Bone Ink & Ash-Violet Spot Screenprint',
      care: [
        'Cold gentle wash inside out with similar dark tones',
        'Avoid harsh stain removers or optical brighteners',
        'Dry flat or hang in shade to maintain collar tension',
        'Steam lightly from reverse side only',
      ],
    },
    createdAt: '2026-11-05T00:00:00.000Z',
  },
];

export const NEXT_RELEASE_UNLOCK_ISO = '2026-12-06T18:30:00+05:30';

export const UPCOMING_ARCHIVE_SLOTS: UpcomingReleaseSlot[] = [
  {
    id: 'slot-03',
    pieceNumber: 'Piece 03',
    title: 'Ash-Washed Zip Parka',
    category: 'Outerwear',
    targetNote: 'Next Piece — In Development',
  },
  {
    id: 'slot-04',
    pieceNumber: 'Piece 04',
    title: 'Thorn-Stitch Cargo Trouser',
    category: 'Tailored Utility',
    targetNote: 'Pattern Sampling — Locked Archive',
  },
  {
    id: 'slot-05',
    pieceNumber: 'Piece 05',
    title: 'Oxidized Sigil Knit',
    category: 'Knitwear',
    targetNote: 'Yarn Sourcing — Locked Archive',
  },
];
