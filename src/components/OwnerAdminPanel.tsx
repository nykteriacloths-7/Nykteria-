import { useState } from 'react';
import { Lock, Plus, RotateCcw, Trash2, Upload, Check } from 'lucide-react';
import { GarmentSize, OrderReservation, OrderStatus, Product } from '../types';
import { formatInr, getEffectivePrice } from '../utils/pricing';
import { ResilientGarmentImage } from './ResilientGarmentImage';
import { triggerHaptic } from '../utils/haptics';

interface OwnerAdminPanelProps {
  products: Product[];
  orders: OrderReservation[];
  onUpdateProduct: (productId: string, updates: Partial<Product>) => void;
  onAddProduct: (product: Product) => void;
  onRemoveProduct: (productId: string) => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onResetDefaults: () => void;
  onClosePanel: () => void;
}

type AdminTab = 'edit' | 'add' | 'orders';

const ALL_SIZES: GarmentSize[] = ['S', 'M', 'L', 'XL'];
const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'Confirmed Reservation',
  'Preparing Allocation',
  'Quality Inspection',
  'Dispatched',
];
const OWNER_PASSCODE = 'NYK2026';

export function OwnerAdminPanel({
  products,
  orders,
  onUpdateProduct,
  onAddProduct,
  onRemoveProduct,
  onUpdateOrderStatus,
  onResetDefaults,
  onClosePanel,
}: OwnerAdminPanelProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('edit');
  const [statusNotice, setStatusNotice] = useState('');

  // New Product Form State
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Heavyweight Outerwear');
  const [newPrice, setNewPrice] = useState('2799');
  const [newDiscountEnabled, setNewDiscountEnabled] = useState(false);
  const [newDiscountPercent, setNewDiscountPercent] = useState('10');
  const [newPromoLabel, setNewPromoLabel] = useState('New Release');
  const [newFrontDesc, setNewFrontDesc] = useState('');
  const [newBackDesc, setNewBackDesc] = useState('');
  const [newFrontImage, setNewFrontImage] = useState('');
  const [newBackImage, setNewBackImage] = useState('');
  const [newSizes, setNewSizes] = useState<Record<GarmentSize, boolean>>({
    S: true,
    M: true,
    L: true,
    XL: true,
  });

  const showFlash = (msg: string) => {
    setStatusNotice(msg);
    window.setTimeout(() => setStatusNotice(''), 2600);
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === OWNER_PASSCODE) {
      triggerHaptic('lock');
      setUnlocked(true);
      setPinInput('');
      setPinError('');
    } else {
      triggerHaptic('error');
      setPinError('Invalid owner passcode.');
    }
  };

  const handleImageFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'front' | 'back'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        if (target === 'front') setNewFrontImage(reader.result);
        else setNewBackImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const nextNumber = String(products.length + 1).padStart(2, '0');
    const numericPrice = Math.max(1, Math.round(Number(newPrice) || 1999));
    const numericDiscount = Math.min(85, Math.max(0, Math.round(Number(newDiscountPercent) || 0)));

    const product: Product = {
      id: `nyx-piece-${Date.now()}`,
      releaseNumber: `Piece ${nextNumber}`,
      name: newName.trim(),
      shortName: newName.trim(),
      category: newCategory.trim() || 'Limited Garment',
      priceInr: numericPrice,
      discountEnabled: newDiscountEnabled,
      discountPercent: numericDiscount,
      promoLabel: newPromoLabel.trim() || 'Limited Release',
      frontSummary:
        newFrontDesc.trim() ||
        'Washed charcoal silhouette with NYKTERIA front gothic sigil placement.',
      backSummary:
        newBackDesc.trim() ||
        'Archival gothic back artwork printed with high-density dark-ash ink.',
      editorialNote: `Phased release Piece ${nextNumber}. Tailored in small-batch heavyweight cotton construction.`,
      frontImage: newFrontImage.trim(),
      backImage: newBackImage.trim() || newFrontImage.trim(),
      sizes: { ...newSizes },
      specs: {
        weight: 'Heavyweight Archival Cotton',
        silhouette: 'Oversized Boxy Fit',
        fabric: '100% Combed Ring-Spun Cotton',
        artworkMethod: 'Archival Screenprint',
        care: [
          'Machine wash cold inside out',
          'Hang dry in shade',
          'Do not iron directly on artwork',
        ],
      },
      createdAt: new Date().toISOString(),
    };

    onAddProduct(product);
    setNewName('');
    setNewFrontDesc('');
    setNewBackDesc('');
    setNewFrontImage('');
    setNewBackImage('');
    setActiveTab('edit');
    showFlash(`Released "${product.name}" to active storefront.`);
  };

  return (
    <div
      id="owner-admin-console"
      className="mt-10 border border-[#F3F2F0]/15 bg-[#0b0b0f] p-6 sm:p-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#F3F2F0]/10">
        <div>
          <p className="text-[11px] tracking-[0.18em] uppercase text-[#8B7CA8]">
            Storefront Management
          </p>
          <h3 className="font-display text-xl font-semibold text-[#F3F2F0] mt-1">
            NYKTERIA Owner Admin Console
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {statusNotice && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#A796C9]">
              <Check className="w-3.5 h-3.5" />
              <span>{statusNotice}</span>
            </span>
          )}
          <button
            type="button"
            onClick={onClosePanel}
            className="px-4 py-2 text-xs uppercase tracking-[0.1em] border border-[#F3F2F0]/15 text-[#A1A1AA] hover:text-[#F3F2F0] cursor-pointer"
          >
            Hide Console
          </button>
        </div>
      </div>

      {!unlocked ? (
        <div className="py-8 sm:py-10 max-w-md">
          <div className="flex items-center gap-2.5 text-sm text-[#F3F2F0] mb-2">
            <Lock className="w-4 h-4 text-[#8B7CA8]" />
            <span>Owner Passcode Required</span>
          </div>
          <p className="text-xs text-[#A1A1AA] mb-5 leading-relaxed">
            Restricted storefront console for modifying active garment prices, launch discounts, and
            allocation records.
          </p>

          <form onSubmit={handleUnlock} className="flex flex-wrap items-center gap-3">
            <input
              type="password"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                if (pinError) setPinError('');
              }}
              placeholder="Enter owner passcode"
              aria-label="Owner passcode"
              autoComplete="off"
              className="w-48 bg-[#101014] border border-[#F3F2F0]/15 px-3.5 py-2.5 text-sm font-mono-num text-[#F3F2F0] placeholder:text-[#52525B] focus:outline-none focus:border-[#8B7CA8] min-h-[44px]"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#F3F2F0] text-[#070709] hover:bg-[#E4E2DE] text-xs font-semibold tracking-[0.12em] uppercase cursor-pointer min-h-[44px] transition-colors"
            >
              Unlock Console
            </button>
          </form>
          {pinError && <p className="mt-3 text-xs text-red-400">{pinError}</p>}
        </div>
      ) : (
        <div className="pt-6 space-y-6">
          {/* Admin Controls & Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'edit'}
                onClick={() => setActiveTab('edit')}
                className={`px-4 py-2 text-xs font-medium uppercase tracking-[0.1em] border cursor-pointer ${
                  activeTab === 'edit'
                    ? 'bg-[#F3F2F0] text-[#070709] border-[#F3F2F0]'
                    : 'bg-[#101014] text-[#A1A1AA] border-[#F3F2F0]/15 hover:text-[#F3F2F0]'
                }`}
              >
                Edit Prices & Offers ({products.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'add'}
                onClick={() => setActiveTab('add')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium uppercase tracking-[0.1em] border cursor-pointer ${
                  activeTab === 'add'
                    ? 'bg-[#F3F2F0] text-[#070709] border-[#F3F2F0]'
                    : 'bg-[#101014] text-[#A1A1AA] border-[#F3F2F0]/15 hover:text-[#F3F2F0]'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Release New Piece</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'orders'}
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-2 text-xs font-medium uppercase tracking-[0.1em] border cursor-pointer ${
                  activeTab === 'orders'
                    ? 'bg-[#F3F2F0] text-[#070709] border-[#F3F2F0]'
                    : 'bg-[#101014] text-[#A1A1AA] border-[#F3F2F0]/15 hover:text-[#F3F2F0]'
                }`}
              >
                Reservations ({orders.length})
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onResetDefaults();
                  showFlash('Restored default NYKTERIA catalog.');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#F3F2F0]/15 text-xs text-[#A1A1AA] hover:text-[#F3F2F0] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('lock');
                  setUnlocked(false);
                  setPinInput('');
                  setPinError('');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#8B7CA8]/45 bg-[#101014] text-xs font-medium tracking-[0.08em] uppercase text-[#F3F2F0] hover:border-[#A796C9] cursor-pointer min-h-[40px]"
              >
                <Lock className="w-3.5 h-3.5 text-[#A796C9]" />
                <span>Lock Admin</span>
              </button>
            </div>
          </div>

          {/* TAB 1: Edit Existing Products */}
          {activeTab === 'edit' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {products.map((item) => {
                const effective = getEffectivePrice(item);
                return (
                  <div
                    key={item.id}
                    className="border border-[#F3F2F0]/10 bg-[#101014] p-5 space-y-5"
                  >
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#F3F2F0]/10">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 aspect-[3/4] bg-[#070709] border border-[#F3F2F0]/10 overflow-hidden shrink-0">
                          <ResilientGarmentImage
                            src={item.frontImage}
                            alt={item.name}
                            title={item.shortName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-[11px] font-mono-num uppercase tracking-[0.14em] text-[#8B7CA8]">
                            {item.releaseNumber} · {item.category}
                          </p>
                          <h4 className="text-sm font-semibold text-[#F3F2F0] mt-0.5">
                            {item.name}
                          </h4>
                          <p className="font-mono-num text-xs text-[#A1A1AA] mt-1">
                            Live Price: <strong className="text-[#F3F2F0]">{formatInr(effective.finalPrice)}</strong>
                            {effective.hasDiscount && ` (${item.discountPercent}% off ${formatInr(effective.originalPrice)})`}
                          </p>
                        </div>
                      </div>

                      {products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            onRemoveProduct(item.id);
                            showFlash(`Removed ${item.shortName}.`);
                          }}
                          aria-label={`Remove ${item.name}`}
                          className="p-2 text-[#A1A1AA] hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Price & Discount Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-[#A1A1AA] mb-1.5">
                          Base Price (₹ INR)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={item.priceInr}
                          onChange={(e) =>
                            onUpdateProduct(item.id, {
                              priceInr: Math.max(1, Number(e.target.value) || 0),
                            })
                          }
                          className="w-full bg-[#070709] border border-[#F3F2F0]/15 px-3 py-2 text-sm font-mono-num text-[#F3F2F0] focus:outline-none focus:border-[#8B7CA8]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-[#A1A1AA] mb-1.5">
                          Discount (%)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={85}
                          value={item.discountPercent}
                          onChange={(e) =>
                            onUpdateProduct(item.id, {
                              discountPercent: Math.min(
                                85,
                                Math.max(0, Number(e.target.value) || 0)
                              ),
                            })
                          }
                          className="w-full bg-[#070709] border border-[#F3F2F0]/15 px-3 py-2 text-sm font-mono-num text-[#F3F2F0] focus:outline-none focus:border-[#8B7CA8]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-[#A1A1AA] mb-1.5">
                          Offer Status
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateProduct(item.id, {
                              discountEnabled: !item.discountEnabled,
                            })
                          }
                          className={`w-full py-2 px-3 text-xs font-medium uppercase tracking-[0.1em] border cursor-pointer transition-colors ${
                            item.discountEnabled
                              ? 'bg-[#8B7CA8] text-[#070709] border-[#8B7CA8]'
                              : 'bg-[#070709] text-[#A1A1AA] border-[#F3F2F0]/15 hover:text-[#F3F2F0]'
                          }`}
                        >
                          {item.discountEnabled ? 'Offer Active' : 'Offer Off'}
                        </button>
                      </div>
                    </div>

                    {/* Promo Label & Size Availability */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[#A1A1AA] mb-1.5">
                          Promo Label Text
                        </label>
                        <input
                          type="text"
                          value={item.promoLabel}
                          onChange={(e) =>
                            onUpdateProduct(item.id, { promoLabel: e.target.value })
                          }
                          placeholder="First Release Offer"
                          className="w-full bg-[#070709] border border-[#F3F2F0]/15 px-3 py-2 text-sm text-[#F3F2F0] focus:outline-none focus:border-[#8B7CA8]"
                        />
                      </div>

                      <div>
                        <span className="block text-xs text-[#A1A1AA] mb-1.5">
                          Size Stock Toggle
                        </span>
                        <div className="grid grid-cols-4 gap-1.5">
                          {ALL_SIZES.map((sz) => {
                            const inStock = item.sizes[sz];
                            return (
                              <button
                                key={sz}
                                type="button"
                                onClick={() =>
                                  onUpdateProduct(item.id, {
                                    sizes: { ...item.sizes, [sz]: !inStock },
                                  })
                                }
                                className={`py-2 text-xs font-mono-num border cursor-pointer ${
                                  inStock
                                    ? 'bg-[#F3F2F0] text-[#070709] border-[#F3F2F0]'
                                    : 'bg-[#070709] text-[#52525B] border-[#F3F2F0]/10 line-through'
                                }`}
                              >
                                {sz}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: Add New Product */}
          {activeTab === 'add' && (
            <form
              onSubmit={handleCreateProduct}
              className="border border-[#F3F2F0]/10 bg-[#101014] p-6 space-y-5"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1.5">
                    Garment Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="NYKTERIA Ash-Washed Zip Parka"
                    className="w-full bg-[#070709] border border-[#F3F2F0]/15 px-3.5 py-2.5 text-sm text-[#F3F2F0] focus:outline-none focus:border-[#8B7CA8]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1.5">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Heavyweight Outerwear"
                    className="w-full bg-[#070709] border border-[#F3F2F0]/15 px-3.5 py-2.5 text-sm text-[#F3F2F0] focus:outline-none focus:border-[#8B7CA8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1.5">
                    Price (₹ INR) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full bg-[#070709] border border-[#F3F2F0]/15 px-3.5 py-2.5 text-sm font-mono-num text-[#F3F2F0] focus:outline-none focus:border-[#8B7CA8]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1.5">
                    Discount (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={85}
                    value={newDiscountPercent}
                    onChange={(e) => setNewDiscountPercent(e.target.value)}
                    className="w-full bg-[#070709] border border-[#F3F2F0]/15 px-3.5 py-2.5 text-sm font-mono-num text-[#F3F2F0] focus:outline-none focus:border-[#8B7CA8]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1.5">
                    Promo Label
                  </label>
                  <input
                    type="text"
                    value={newPromoLabel}
                    onChange={(e) => setNewPromoLabel(e.target.value)}
                    className="w-full bg-[#070709] border border-[#F3F2F0]/15 px-3.5 py-2.5 text-sm text-[#F3F2F0] focus:outline-none focus:border-[#8B7CA8]"
                  />
                </div>
                <div>
                  <span className="block text-xs text-[#A1A1AA] mb-1.5">
                    Activate Offer
                  </span>
                  <button
                    type="button"
                    onClick={() => setNewDiscountEnabled((v) => !v)}
                    className={`w-full py-2.5 px-3 text-xs font-medium uppercase tracking-[0.1em] border cursor-pointer ${
                      newDiscountEnabled
                        ? 'bg-[#8B7CA8] text-[#070709] border-[#8B7CA8]'
                        : 'bg-[#070709] text-[#A1A1AA] border-[#F3F2F0]/15'
                    }`}
                  >
                    {newDiscountEnabled ? 'Offer Enabled' : 'Standard Price'}
                  </button>
                </div>
              </div>

              <div>
                <span className="block text-xs text-[#A1A1AA] mb-1.5">Available Sizes</span>
                <div className="flex flex-wrap gap-2">
                  {ALL_SIZES.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() =>
                        setNewSizes((prev) => ({ ...prev, [sz]: !prev[sz] }))
                      }
                      className={`px-4 py-2 text-xs font-mono-num border cursor-pointer ${
                        newSizes[sz]
                          ? 'bg-[#F3F2F0] text-[#070709] border-[#F3F2F0]'
                          : 'bg-[#070709] text-[#52525B] border-[#F3F2F0]/15'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1.5">
                    Front Silhouette & Print Description
                  </label>
                  <textarea
                    rows={2}
                    value={newFrontDesc}
                    onChange={(e) => setNewFrontDesc(e.target.value)}
                    placeholder="Describe front construction, wash, and chest emblem..."
                    className="w-full bg-[#070709] border border-[#F3F2F0]/15 px-3.5 py-2.5 text-sm text-[#F3F2F0] focus:outline-none focus:border-[#8B7CA8]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1.5">
                    Back Artwork Description
                  </label>
                  <textarea
                    rows={2}
                    value={newBackDesc}
                    onChange={(e) => setNewBackDesc(e.target.value)}
                    placeholder="Describe back illustration or paneling..."
                    className="w-full bg-[#070709] border border-[#F3F2F0]/15 px-3.5 py-2.5 text-sm text-[#F3F2F0] focus:outline-none focus:border-[#8B7CA8]"
                  />
                </div>
              </div>

              {/* Image URL or File Upload */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs text-[#A1A1AA]">
                    Front Image (URL or Upload)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFrontImage}
                      onChange={(e) => setNewFrontImage(e.target.value)}
                      placeholder="Paste image URL or upload file..."
                      className="flex-1 bg-[#070709] border border-[#F3F2F0]/15 px-3 py-2 text-xs text-[#F3F2F0] focus:outline-none focus:border-[#8B7CA8]"
                    />
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#070709] border border-[#F3F2F0]/20 text-xs text-[#F3F2F0] hover:border-[#8B7CA8] cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageFileUpload(e, 'front')}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs text-[#A1A1AA]">
                    Back Image (URL or Upload)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newBackImage}
                      onChange={(e) => setNewBackImage(e.target.value)}
                      placeholder="Paste image URL or upload file..."
                      className="flex-1 bg-[#070709] border border-[#F3F2F0]/15 px-3 py-2 text-xs text-[#F3F2F0] focus:outline-none focus:border-[#8B7CA8]"
                    />
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#070709] border border-[#F3F2F0]/20 text-xs text-[#F3F2F0] hover:border-[#8B7CA8] cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageFileUpload(e, 'back')}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-3 bg-[#F3F2F0] text-[#070709] hover:bg-[#E4E2DE] text-xs font-semibold tracking-[0.14em] uppercase cursor-pointer min-h-[44px]"
              >
                Publish New Piece to Storefront
              </button>
            </form>
          )}

          {/* TAB 3: Reservations */}
          {activeTab === 'orders' && (
            <div className="border border-[#F3F2F0]/10 bg-[#101014] p-5">
              {orders.length === 0 ? (
                <p className="text-sm text-[#A1A1AA] py-6 text-center">
                  No reservations submitted yet in this browser.
                </p>
              ) : (
                <div className="divide-y divide-[#F3F2F0]/10">
                  {orders.map((order) => (
                    <div key={order.orderId} className="py-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="font-mono-num text-xs text-[#A796C9]">
                            #{order.orderId} · {order.status}
                          </p>
                          <p className="text-sm font-medium text-[#F3F2F0] mt-0.5">
                            {order.customerName} ({order.city})
                          </p>
                          <p className="text-xs text-[#A1A1AA] mt-0.5">
                            {order.items
                              .map((i) => `${i.productName} [${i.size} × ${i.quantity}]`)
                              .join(', ')}
                          </p>
                        </div>
                        <span className="font-mono-num text-sm font-semibold text-[#F3F2F0]">
                          {formatInr(order.totalInr)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {ORDER_STATUS_OPTIONS.map((stage) => {
                          const active = order.status === stage;
                          return (
                            <button
                              key={stage}
                              type="button"
                              onClick={() => {
                                triggerHaptic('select');
                                onUpdateOrderStatus(order.orderId, stage);
                                showFlash(`Order #${order.orderId} → ${stage}`);
                              }}
                              aria-pressed={active}
                              className={`px-2.5 py-1.5 text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                active
                                  ? 'border-[#8B7CA8] bg-[#8B7CA8]/20 text-[#F3F2F0]'
                                  : 'border-[#F3F2F0]/10 bg-[#070709] text-[#A1A1AA] hover:text-[#F3F2F0]'
                              }`}
                            >
                              {stage}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
