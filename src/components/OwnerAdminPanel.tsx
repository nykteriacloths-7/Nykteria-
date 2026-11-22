import { useState } from 'react';
import {
  Lock,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  Check,
  KeyRound,
  FlaskConical,
  Eye,
  EyeOff,
  MailCheck,
  AlertTriangle,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { GarmentSize, OrderReservation, OrderStatus, Product } from '../types';
import { formatInr, getEffectivePrice } from '../utils/pricing';
import {
  buildOrderMailtoHref,
  buildOrderSummaryText,
  EmailDispatchResult,
  sendOrderEmailViaFormSubmit,
  STORE_OWNER_EMAIL,
} from '../utils/orderEmail';
import { ResilientGarmentImage } from './ResilientGarmentImage';
import { triggerHaptic } from '../utils/haptics';

interface OwnerAdminPanelProps {
  products: Product[];
  orders: OrderReservation[];
  onUpdateProduct: (productId: string, updates: Partial<Product>) => void;
  onAddProduct: (product: Product) => void;
  onRemoveProduct: (productId: string) => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onUpdateOrderEmailStatus: (orderId: string, emailDelivered: boolean) => void;
  onCreateTestOrder: () => OrderReservation;
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

const OWNER_EMAIL = (import.meta.env.VITE_OWNER_ADMIN_EMAIL || STORE_OWNER_EMAIL)
  .trim()
  .toLowerCase();
const FALLBACK_OWNER_PASSWORD = (import.meta.env.VITE_OWNER_ADMIN_PASSWORD || 'Nykteria@2026').trim();
const PASSWORD_OVERRIDE_KEY = 'nykteria_owner_password_v1';

function hasCustomOwnerPassword(): boolean {
  try {
    const custom = window.localStorage.getItem(PASSWORD_OVERRIDE_KEY);
    return Boolean(custom && custom.trim().length >= 6);
  } catch {
    return false;
  }
}

function getActiveOwnerPassword(): string {
  try {
    const custom = window.localStorage.getItem(PASSWORD_OVERRIDE_KEY);
    return custom && custom.trim().length >= 6 ? custom.trim() : FALLBACK_OWNER_PASSWORD;
  } catch {
    return FALLBACK_OWNER_PASSWORD;
  }
}

function readUploadedImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const rawDataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!rawDataUrl) {
        reject(new Error('Invalid image data.'));
        return;
      }
      // Keep small images untouched; scale large photos cleanly so localStorage persists reliably
      if (file.size <= 450 * 1024) {
        resolve(rawDataUrl);
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(rawDataUrl);
      img.onload = () => {
        const maxDim = 1200;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const compressed = canvas.toDataURL('image/jpeg', 0.86);
        resolve(compressed.length < rawDataUrl.length ? compressed : rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function OwnerAdminPanel({
  products,
  orders,
  onUpdateProduct,
  onAddProduct,
  onRemoveProduct,
  onUpdateOrderStatus,
  onUpdateOrderEmailStatus,
  onCreateTestOrder,
  onResetDefaults,
  onClosePanel,
}: OwnerAdminPanelProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [customPwActive, setCustomPwActive] = useState<boolean>(() => hasCustomOwnerPassword());

  // Login screen "Forgot or Set Password" panel
  const [showLoginReset, setShowLoginReset] = useState(false);
  const [resetEmailInput, setResetEmailInput] = useState('');
  const [resetNewPw, setResetNewPw] = useState('');
  const [resetConfirmPw, setResetConfirmPw] = useState('');
  const [resetError, setResetError] = useState('');

  // Unlocked "Set / Change Password" panel
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPwInput, setCurrentPwInput] = useState('');
  const [newPwInput, setNewPwInput] = useState('');
  const [pwChangeMessage, setPwChangeMessage] = useState('');
  const [pwChangeIsError, setPwChangeIsError] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('edit');
  const [statusNotice, setStatusNotice] = useState('');
  const [sendingTestOrder, setSendingTestOrder] = useState(false);
  const [adminTestStatus, setAdminTestStatus] = useState<{
    order: OrderReservation;
    result: EmailDispatchResult;
  } | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

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
    window.setTimeout(() => setStatusNotice(''), 4200);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = emailInput.trim().toLowerCase();
    const candidatePw = passwordInput.trim();
    const activePw = getActiveOwnerPassword();

    if (!trimmedEmail || !candidatePw) {
      triggerHaptic('error');
      setAuthError('Enter your owner email and password.');
      setAuthSuccess('');
      return;
    }

    if (trimmedEmail !== OWNER_EMAIL) {
      triggerHaptic('error');
      setAuthError('Invalid owner email or password.');
      setAuthSuccess('');
      return;
    }

    if (candidatePw !== activePw) {
      triggerHaptic('error');
      setAuthError('Invalid owner email or password.');
      setAuthSuccess('');
      return;
    }

    triggerHaptic('lock');
    setUnlocked(true);
    setPasswordInput('');
    setAuthError('');
    setAuthSuccess('');
    setShowLoginReset(false);
  };

  const handleLoginPasswordSetup = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = resetEmailInput.trim().toLowerCase();
    const nextPw = resetNewPw.trim();
    const confirmPw = resetConfirmPw.trim();

    if (trimmedEmail !== OWNER_EMAIL) {
      triggerHaptic('error');
      setResetError('Owner email does not match the registered storefront account.');
      return;
    }
    if (nextPw.length < 6) {
      triggerHaptic('error');
      setResetError('New password must be at least 6 characters.');
      return;
    }
    if (nextPw !== confirmPw) {
      triggerHaptic('error');
      setResetError('Passwords do not match.');
      return;
    }

    try {
      window.localStorage.setItem(PASSWORD_OVERRIDE_KEY, nextPw);
    } catch {
      setResetError('Unable to write password to browser storage.');
      return;
    }

    triggerHaptic('select');
    setCustomPwActive(true);
    setResetError('');
    setResetEmailInput('');
    setResetNewPw('');
    setResetConfirmPw('');
    setShowLoginReset(false);
    setAuthError('');
    setPasswordInput('');
    setAuthSuccess('New owner password saved in this browser. Sign in with your new password.');
  };

  const handleRestoreDefaultFromLogin = () => {
    try {
      window.localStorage.removeItem(PASSWORD_OVERRIDE_KEY);
    } catch {
      // Ignore storage error
    }
    triggerHaptic('select');
    setCustomPwActive(false);
    setResetError('');
    setResetEmailInput('');
    setResetNewPw('');
    setResetConfirmPw('');
    setShowLoginReset(false);
    setAuthError('');
    setPasswordInput('');
    setAuthSuccess('Custom browser password cleared. Use your storefront owner password.');
  };

  const handleLockAdmin = () => {
    triggerHaptic('lock');
    setUnlocked(false);
    setEmailInput('');
    setPasswordInput('');
    setAuthError('');
    setAuthSuccess('');
    setShowChangePassword(false);
    setShowLoginReset(false);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const activePw = getActiveOwnerPassword();
    if (currentPwInput.trim() !== activePw) {
      triggerHaptic('error');
      setPwChangeIsError(true);
      setPwChangeMessage('Current password is incorrect.');
      return;
    }
    const trimmedNew = newPwInput.trim();
    if (trimmedNew.length < 6) {
      triggerHaptic('error');
      setPwChangeIsError(true);
      setPwChangeMessage('New password must be at least 6 characters.');
      return;
    }
    try {
      window.localStorage.setItem(PASSWORD_OVERRIDE_KEY, trimmedNew);
    } catch {
      setPwChangeIsError(true);
      setPwChangeMessage('Could not save password to browser storage.');
      return;
    }
    triggerHaptic('select');
    setCustomPwActive(true);
    setCurrentPwInput('');
    setNewPwInput('');
    setPwChangeIsError(false);
    setPwChangeMessage('New owner password saved.');
    showFlash('New owner password saved for this storefront.');
  };

  const handleRestoreDefaultInsideAdmin = () => {
    try {
      window.localStorage.removeItem(PASSWORD_OVERRIDE_KEY);
    } catch {
      // Ignore storage errors
    }
    triggerHaptic('select');
    setCustomPwActive(false);
    setCurrentPwInput('');
    setNewPwInput('');
    setPwChangeIsError(false);
    setPwChangeMessage('Custom browser password cleared.');
    showFlash('Custom browser password cleared.');
  };

  const handleCopyOrder = async (order: OrderReservation) => {
    const summary = buildOrderSummaryText(order);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary);
      } else {
        const el = document.createElement('textarea');
        el.value = summary;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      triggerHaptic('tap');
      setCopiedOrderId(order.orderId);
      window.setTimeout(() => setCopiedOrderId((prev) => (prev === order.orderId ? null : prev)), 2500);
    } catch {
      // Ignore copy failures
    }
  };

  const handleSendAdminTestOrder = async () => {
    if (sendingTestOrder) return;
    setSendingTestOrder(true);
    setAdminTestStatus(null);
    const created = onCreateTestOrder();
    triggerHaptic('confirmOrder');
    const result = await sendOrderEmailViaFormSubmit(created);
    onUpdateOrderEmailStatus(created.orderId, result.delivered);
    setAdminTestStatus({
      order: { ...created, emailDelivered: result.delivered },
      result,
    });
    setSendingTestOrder(false);
    showFlash(
      result.delivered
        ? `Test order #${created.orderId} sent to ${STORE_OWNER_EMAIL}.`
        : `Test order #${created.orderId} saved locally — email fallback ready.`
    );
  };

  const handleImageFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'front' | 'back'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readUploadedImageAsDataUrl(file);
      if (target === 'front') setNewFrontImage(dataUrl);
      else setNewBackImage(dataUrl);
      triggerHaptic('select');
    } catch {
      showFlash('Unable to process selected image file.');
    } finally {
      e.target.value = '';
    }
  };

  const handleExistingProductImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    product: Product,
    side: 'frontImage' | 'backImage'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readUploadedImageAsDataUrl(file);
      onUpdateProduct(product.id, { [side]: dataUrl });
      triggerHaptic('select');
      showFlash(
        `Updated ${side === 'frontImage' ? 'Front' : 'Back'} photo for ${product.shortName}.`
      );
    } catch {
      showFlash('Unable to process selected image file.');
    } finally {
      e.target.value = '';
    }
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
        <div className="py-8 sm:py-10 max-w-lg space-y-5">
          <div>
            <div className="flex items-center gap-2.5 text-sm text-[#F3F2F0] mb-2">
              <Lock className="w-4 h-4 text-[#8B7CA8]" />
              <span>Owner Email & Password Required</span>
            </div>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Restricted storefront console for the registered NYKTERIA owner.
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-3">
            <div>
              <label htmlFor="nyx-owner-email" className="block text-xs text-[#A1A1AA] mb-1">
                Owner Email
              </label>
              <input
                id="nyx-owner-email"
                type="email"
                required
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (authError) setAuthError('');
                }}
                placeholder="Enter owner email"
                autoComplete="email"
                className="w-full bg-[#15151d] border border-[#F3F2F0]/15 px-3.5 py-2.5 text-sm text-[#F3F2F0] placeholder:text-[#71717A] focus:outline-none focus:border-[#8B7CA8] min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="nyx-owner-password" className="block text-xs text-[#A1A1AA] mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="nyx-owner-password"
                  type={showPasswordText ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (authError) setAuthError('');
                  }}
                  placeholder="Enter owner password"
                  autoComplete="current-password"
                  className="w-full bg-[#15151d] border border-[#F3F2F0]/15 pl-3.5 pr-11 py-2.5 text-sm text-[#F3F2F0] placeholder:text-[#71717A] focus:outline-none focus:border-[#8B7CA8] min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordText((v) => !v)}
                  aria-label={showPasswordText ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[#A1A1AA] hover:text-[#F3F2F0] cursor-pointer"
                >
                  {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#F3F2F0] text-[#0b0b10] hover:bg-[#E4E2DE] text-xs font-semibold tracking-[0.12em] uppercase cursor-pointer min-h-[44px] transition-colors whitespace-nowrap shrink-0"
              >
                Sign In & Unlock
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  setShowLoginReset((v) => !v);
                  setResetError('');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 border border-[#8B7CA8]/40 bg-[#15151d] hover:border-[#A796C9] text-xs text-[#D4D4D8] hover:text-[#F3F2F0] cursor-pointer min-h-[44px] transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#A796C9]" />
                <span>
                  {showLoginReset ? 'Close Password Setup' : 'Set / Reset Owner Password'}
                </span>
              </button>
            </div>
          </form>

          {authError && (
            <p className="text-xs text-red-400 border border-red-500/30 bg-red-950/20 px-3.5 py-2.5">
              {authError}
            </p>
          )}
          {authSuccess && (
            <p className="text-xs text-[#A796C9] border border-[#8B7CA8]/40 bg-[#15151d] px-3.5 py-2.5 flex items-center gap-2">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>{authSuccess}</span>
            </p>
          )}

          {showLoginReset && (
            <form
              onSubmit={handleLoginPasswordSetup}
              className="border border-[#8B7CA8]/40 bg-[#15151d] p-4 sm:p-5 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#F3F2F0]">
                  Set or Reset Owner Password
                </p>
                {customPwActive && (
                  <button
                    type="button"
                    onClick={handleRestoreDefaultFromLogin}
                    className="text-[11px] text-[#A796C9] hover:text-[#F3F2F0] underline underline-offset-4 cursor-pointer"
                  >
                    Clear Browser Override
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                Verify your registered owner email to set a custom password for this browser.
              </p>

              <div>
                <label htmlFor="nyx-reset-email" className="block text-[11px] text-[#A1A1AA] mb-1">
                  Registered Owner Email
                </label>
                <input
                  id="nyx-reset-email"
                  type="email"
                  required
                  value={resetEmailInput}
                  onChange={(e) => setResetEmailInput(e.target.value)}
                  placeholder="Enter owner email"
                  autoComplete="email"
                  className="w-full bg-[#0f0f15] border border-[#F3F2F0]/15 px-3 py-2 text-sm text-[#F3F2F0] placeholder:text-[#71717A] focus:outline-none focus:border-[#8B7CA8]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="nyx-reset-pw" className="block text-[11px] text-[#A1A1AA] mb-1">
                    New Password (min 6 chars)
                  </label>
                  <input
                    id="nyx-reset-pw"
                    type="password"
                    required
                    value={resetNewPw}
                    onChange={(e) => setResetNewPw(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-[#0f0f15] border border-[#F3F2F0]/15 px-3 py-2 text-sm text-[#F3F2F0] placeholder:text-[#71717A] focus:outline-none focus:border-[#8B7CA8]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="nyx-reset-pw-confirm"
                    className="block text-[11px] text-[#A1A1AA] mb-1"
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="nyx-reset-pw-confirm"
                    type="password"
                    required
                    value={resetConfirmPw}
                    onChange={(e) => setResetConfirmPw(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-[#0f0f15] border border-[#F3F2F0]/15 px-3 py-2 text-sm text-[#F3F2F0] placeholder:text-[#71717A] focus:outline-none focus:border-[#8B7CA8]"
                  />
                </div>
              </div>

              {resetError && <p className="text-xs text-red-400">{resetError}</p>}

              <button
                type="submit"
                className="px-4 py-2.5 bg-[#F3F2F0] text-[#0b0b10] hover:bg-[#E4E2DE] text-xs font-semibold uppercase tracking-[0.12em] cursor-pointer min-h-[40px]"
              >
                Save New Password
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="pt-6 space-y-6">
          {/* Verified Owner Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#A1A1AA] pb-4 border-b border-[#F3F2F0]/10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#8B7CA8] uppercase tracking-[0.12em]">Verified Owner</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num text-[#F3F2F0]">{OWNER_EMAIL}</span>
              <span aria-hidden="true">·</span>
              <span className="text-[11px] text-[#A1A1AA]">
                {customPwActive ? 'Custom Password Active' : 'Initial Password Active'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowChangePassword((prev) => !prev);
                setPwChangeMessage('');
                setPwChangeIsError(false);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-[#A796C9] hover:text-[#F3F2F0] cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{showChangePassword ? 'Cancel Password Edit' : 'Set / Change Password'}</span>
            </button>
          </div>

          {showChangePassword && (
            <form
              onSubmit={handleChangePassword}
              className="border border-[#F3F2F0]/10 bg-[#15151d] p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
            >
              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPwInput}
                  onChange={(e) => setCurrentPwInput(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full bg-[#0f0f15] border border-[#F3F2F0]/15 px-3 py-2 text-sm text-[#F3F2F0]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPwInput}
                  onChange={(e) => setNewPwInput(e.target.value)}
                  placeholder="Min 6 chars"
                  className="w-full bg-[#0f0f15] border border-[#F3F2F0]/15 px-3 py-2 text-sm text-[#F3F2F0]"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-[#F3F2F0] text-[#0b0b10] text-xs font-semibold uppercase tracking-[0.1em] cursor-pointer min-h-[40px]"
                >
                  Save Password
                </button>
                {customPwActive && (
                  <button
                    type="button"
                    onClick={handleRestoreDefaultInsideAdmin}
                    className="px-3 py-2.5 border border-[#F3F2F0]/15 text-[11px] uppercase tracking-[0.08em] text-[#A1A1AA] hover:text-[#F3F2F0] cursor-pointer min-h-[40px]"
                  >
                    Clear Override
                  </button>
                )}
              </div>
              {pwChangeMessage && (
                <p
                  className={`sm:col-span-3 text-xs ${
                    pwChangeIsError ? 'text-red-400' : 'text-[#A796C9]'
                  }`}
                >
                  {pwChangeMessage}
                </p>
              )}
            </form>
          )}

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
                    ? 'bg-[#F3F2F0] text-[#0b0b10] border-[#F3F2F0]'
                    : 'bg-[#15151d] text-[#A1A1AA] border-[#F3F2F0]/15 hover:text-[#F3F2F0]'
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
                    ? 'bg-[#F3F2F0] text-[#0b0b10] border-[#F3F2F0]'
                    : 'bg-[#15151d] text-[#A1A1AA] border-[#F3F2F0]/15 hover:text-[#F3F2F0]'
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
                    ? 'bg-[#F3F2F0] text-[#0b0b10] border-[#F3F2F0]'
                    : 'bg-[#15151d] text-[#A1A1AA] border-[#F3F2F0]/15 hover:text-[#F3F2F0]'
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
                onClick={handleLockAdmin}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#8B7CA8]/45 bg-[#15151d] text-xs font-medium tracking-[0.08em] uppercase text-[#F3F2F0] hover:border-[#A796C9] cursor-pointer min-h-[40px]"
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

                    {/* Front & Back Garment Photo Editor */}
                    <div className="pt-4 border-t border-[#F3F2F0]/10 space-y-3">
                      <span className="block text-xs uppercase tracking-[0.12em] text-[#8B7CA8]">
                        Front & Back Garment Photos
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Front Photo */}
                        <div className="border border-[#F3F2F0]/10 bg-[#0b0b0f] p-3 space-y-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-11 aspect-[3/4] bg-[#070709] border border-[#F3F2F0]/10 overflow-hidden shrink-0">
                              <ResilientGarmentImage
                                src={item.frontImage}
                                alt={`${item.shortName} Front`}
                                title={item.shortName}
                                viewLabel="Front"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#F3F2F0]">
                                Front Photo
                              </p>
                              <label className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#15151d] border border-[#F3F2F0]/20 text-[11px] text-[#F3F2F0] hover:border-[#8B7CA8] cursor-pointer">
                                <Upload className="w-3 h-3 text-[#A796C9]" />
                                <span>Upload File</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) =>
                                    handleExistingProductImageUpload(e, item, 'frontImage')
                                  }
                                  className="sr-only"
                                />
                              </label>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={item.frontImage}
                            onChange={(e) =>
                              onUpdateProduct(item.id, { frontImage: e.target.value })
                            }
                            placeholder="Paste Front Image URL..."
                            className="w-full bg-[#070709] border border-[#F3F2F0]/15 px-2.5 py-1.5 text-[11px] text-[#F3F2F0] placeholder:text-[#71717A] focus:outline-none focus:border-[#8B7CA8]"
                          />
                        </div>

                        {/* Back Photo */}
                        <div className="border border-[#F3F2F0]/10 bg-[#0b0b0f] p-3 space-y-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-11 aspect-[3/4] bg-[#070709] border border-[#F3F2F0]/10 overflow-hidden shrink-0">
                              <ResilientGarmentImage
                                src={item.backImage}
                                alt={`${item.shortName} Back`}
                                title={item.shortName}
                                viewLabel="Back"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#F3F2F0]">
                                Back Photo
                              </p>
                              <label className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#15151d] border border-[#F3F2F0]/20 text-[11px] text-[#F3F2F0] hover:border-[#8B7CA8] cursor-pointer">
                                <Upload className="w-3 h-3 text-[#A796C9]" />
                                <span>Upload File</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) =>
                                    handleExistingProductImageUpload(e, item, 'backImage')
                                  }
                                  className="sr-only"
                                />
                              </label>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={item.backImage}
                            onChange={(e) =>
                              onUpdateProduct(item.id, { backImage: e.target.value })
                            }
                            placeholder="Paste Back Image URL..."
                            className="w-full bg-[#070709] border border-[#F3F2F0]/15 px-2.5 py-1.5 text-[11px] text-[#F3F2F0] placeholder:text-[#71717A] focus:outline-none focus:border-[#8B7CA8]"
                          />
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

              {/* Image URL or File Upload + Live Previews */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-[#F3F2F0]/10 bg-[#0b0b0f] p-3.5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 aspect-[3/4] bg-[#070709] border border-[#F3F2F0]/10 overflow-hidden shrink-0">
                      <ResilientGarmentImage
                        src={newFrontImage}
                        alt="New Front Preview"
                        title={newName.trim() || 'Front'}
                        viewLabel="Front"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <label className="block text-xs text-[#F3F2F0] font-medium">
                        Front Image (URL or Upload)
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#15151d] border border-[#F3F2F0]/20 text-xs text-[#F3F2F0] hover:border-[#8B7CA8] cursor-pointer shrink-0">
                          <Upload className="w-3.5 h-3.5 text-[#A796C9]" />
                          <span>Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageFileUpload(e, 'front')}
                            className="sr-only"
                          />
                        </label>
                        {newFrontImage && (
                          <button
                            type="button"
                            onClick={() => setNewFrontImage('')}
                            className="px-2.5 py-1.5 border border-[#F3F2F0]/15 text-[11px] text-[#A1A1AA] hover:text-[#F3F2F0] cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={newFrontImage}
                    onChange={(e) => setNewFrontImage(e.target.value)}
                    placeholder="Paste front image URL or upload file..."
                    className="w-full bg-[#070709] border border-[#F3F2F0]/15 px-3 py-2 text-xs text-[#F3F2F0] focus:outline-none focus:border-[#8B7CA8]"
                  />
                </div>

                <div className="border border-[#F3F2F0]/10 bg-[#0b0b0f] p-3.5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 aspect-[3/4] bg-[#070709] border border-[#F3F2F0]/10 overflow-hidden shrink-0">
                      <ResilientGarmentImage
                        src={newBackImage || newFrontImage}
                        alt="New Back Preview"
                        title={newName.trim() || 'Back'}
                        viewLabel="Back"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <label className="block text-xs text-[#F3F2F0] font-medium">
                        Back Image (URL or Upload)
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#15151d] border border-[#F3F2F0]/20 text-xs text-[#F3F2F0] hover:border-[#8B7CA8] cursor-pointer shrink-0">
                          <Upload className="w-3.5 h-3.5 text-[#A796C9]" />
                          <span>Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageFileUpload(e, 'back')}
                            className="sr-only"
                          />
                        </label>
                        {newBackImage && (
                          <button
                            type="button"
                            onClick={() => setNewBackImage('')}
                            className="px-2.5 py-1.5 border border-[#F3F2F0]/15 text-[11px] text-[#A1A1AA] hover:text-[#F3F2F0] cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={newBackImage}
                    onChange={(e) => setNewBackImage(e.target.value)}
                    placeholder="Paste back image URL or upload file..."
                    className="w-full bg-[#070709] border border-[#F3F2F0]/15 px-3 py-2 text-xs text-[#F3F2F0] focus:outline-none focus:border-[#8B7CA8]"
                  />
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
            <div className="border border-[#F3F2F0]/10 bg-[#15151d] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F3F2F0]/10">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#F3F2F0]">
                    Reservation Pipeline
                  </p>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    Advance garment status live or dispatch a live test order to {STORE_OWNER_EMAIL}.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={sendingTestOrder}
                  onClick={handleSendAdminTestOrder}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-[#8B7CA8]/60 bg-[#0f0f15] hover:border-[#A796C9] disabled:opacity-60 text-xs font-medium uppercase tracking-[0.1em] text-[#F3F2F0] whitespace-nowrap shrink-0 min-h-[40px] cursor-pointer"
                >
                  <FlaskConical className="w-3.5 h-3.5 text-[#A796C9]" />
                  <span>{sendingTestOrder ? 'Sending...' : 'Send Test Order'}</span>
                </button>
              </div>

              {adminTestStatus && (
                <div
                  className={`p-4 border space-y-2.5 ${
                    adminTestStatus.result.delivered
                      ? 'border-[#8B7CA8]/45 bg-[#0f0f15]'
                      : 'border-amber-500/35 bg-amber-950/20'
                  }`}
                >
                  {adminTestStatus.result.delivered ? (
                    <>
                      <div className="flex items-center gap-2 text-xs font-medium text-[#F3F2F0]">
                        <MailCheck className="w-4 h-4 text-[#A796C9] shrink-0" />
                        <span>
                          Test Order #{adminTestStatus.order.orderId} sent to {STORE_OWNER_EMAIL}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                        Check <span className="text-[#D4D4D8]">{STORE_OWNER_EMAIL}</span>{' '}
                        (including Spam / All Mail) and click FormSubmit&apos;s one-time{' '}
                        <span className="text-[#F3F2F0]">&ldquo;Activate Form&rdquo;</span> link if
                        not yet activated.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-2 text-xs text-amber-200">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-medium">
                            Test Order #{adminTestStatus.order.orderId} saved locally —{' '}
                            {adminTestStatus.result.message}
                          </p>
                          {adminTestStatus.result.errorDetail && (
                            <p className="text-[11px] text-amber-200/80 break-words">
                              Error: {adminTestStatus.result.errorDetail}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <a
                          href={buildOrderMailtoHref(adminTestStatus.order)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#F3F2F0] text-[#0b0b10] hover:bg-[#E4E2DE] text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open in Mail / Gmail App ({STORE_OWNER_EMAIL})</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopyOrder(adminTestStatus.order)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#F3F2F0]/20 bg-[#0e0e14] text-[#F3F2F0] hover:border-[#8B7CA8] text-[11px] font-medium uppercase tracking-[0.08em] cursor-pointer transition-colors"
                        >
                          {copiedOrderId === adminTestStatus.order.orderId ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#A796C9]" />
                              <span>Copied Summary</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-[#A796C9]" />
                              <span>Copy Order Summary</span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

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
                            {order.emailDelivered ? ' · Email Sent' : ''}
                          </p>
                          <p className="text-sm font-medium text-[#F3F2F0] mt-0.5">
                            {order.customerName} ({order.city})
                          </p>
                          <p className="text-xs text-[#A1A1AA] mt-0.5">
                            {order.items
                              .map((i) => `${i.productName} [Size ${i.size} × ${i.quantity}]`)
                              .join(', ')}
                          </p>
                          <p className="text-[11px] text-[#71717A] mt-0.5">
                            {order.addressLine1 || order.address}
                            {order.addressLine2 ? `, ${order.addressLine2}` : ''}
                          </p>
                        </div>
                        <span className="font-mono-num text-sm font-semibold text-[#F3F2F0]">
                          {formatInr(order.totalInr)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
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
                                    : 'border-[#F3F2F0]/10 bg-[#0f0f15] text-[#A1A1AA] hover:text-[#F3F2F0]'
                                }`}
                              >
                                {stage}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <a
                            href={buildOrderMailtoHref(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[#F3F2F0]/15 bg-[#0f0f15] hover:border-[#8B7CA8] text-[11px] text-[#D4D4D8] hover:text-[#F3F2F0] whitespace-nowrap"
                          >
                            <ExternalLink className="w-3 h-3 text-[#A796C9]" />
                            <span>Mail App</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopyOrder(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[#F3F2F0]/15 bg-[#0f0f15] hover:border-[#8B7CA8] text-[11px] text-[#D4D4D8] hover:text-[#F3F2F0] whitespace-nowrap cursor-pointer"
                          >
                            {copiedOrderId === order.orderId ? (
                              <>
                                <Check className="w-3 h-3 text-[#A796C9]" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-[#A796C9]" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
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
