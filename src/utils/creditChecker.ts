// Credit checking utilities
// Add this to: src/utils/creditChecker.ts

export interface CreditCheckResult {
  hasEnoughCredits: boolean;
  currentCredits: number;
  requiredCredits: number;
  isPaidUser: boolean;
  message?: string;
}

/**
 * Check if user has enough credits for an operation
 */
export function checkCredits(requiredCredits: number): CreditCheckResult {
  const storedCredits = localStorage.getItem('user_credits');
  const userEmail = localStorage.getItem('user_email');
  
  const currentCredits = storedCredits ? parseInt(storedCredits) : 0;
  const isPaidUser = !!userEmail;
  const hasEnoughCredits = currentCredits >= requiredCredits;

  return {
    hasEnoughCredits,
    currentCredits,
    requiredCredits,
    isPaidUser,
    message: hasEnoughCredits ? undefined : getInsufficientCreditsMessage(currentCredits, requiredCredits, isPaidUser)
  };
}

/**
 * Get appropriate message for insufficient credits
 */
function getInsufficientCreditsMessage(current: number, required: number, isPaidUser: boolean): string {
  const shortage = required - current;
  
  if (current === 0) {
    return isPaidUser 
      ? "You've run out of credits! Upgrade your plan or purchase more credits to continue creating."
      : "You need credits to download your work. Get started with a FREE plan or purchase credits!";
  }
  
  return isPaidUser
    ? `You need ${required} credits but only have ${current}. Purchase ${shortage} more credit${shortage > 1 ? 's' : ''} to continue.`
    : `You need ${required} credits but only have ${current}. Subscribe to a plan or purchase more credits!`;
}

/**
 * Show insufficient credits modal/alert
 */
export function showInsufficientCreditsAlert(result: CreditCheckResult, onBuyMore: () => void) {
  const message = result.message || "Insufficient credits";
  
  // Create and show modal
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn';
  
  modal.innerHTML = `
    <div class="bg-gradient-to-br from-red-500/10 to-orange-500/10 backdrop-blur-xl border border-red-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-scaleIn">
      <div class="text-center space-y-4">
        <div class="text-6xl">⚠️</div>
        <h2 class="text-2xl font-black text-white uppercase tracking-tight">
          ${result.currentCredits === 0 ? 'Out of Credits!' : 'Insufficient Credits'}
        </h2>
        <p class="text-white/80 text-sm leading-relaxed">
          ${message}
        </p>
        <div class="flex gap-3 pt-4">
          <button 
            id="buyMoreBtn"
            class="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black py-3 rounded-xl text-sm uppercase tracking-widest transition-all"
          >
            ${result.isPaidUser ? 'Buy More Credits' : 'Get Credits'}
          </button>
          <button 
            id="closeBtn"
            class="px-6 bg-white/10 hover:bg-white/20 text-white font-black py-3 rounded-xl text-sm uppercase tracking-widest transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add event listeners
  const buyMoreBtn = modal.querySelector('#buyMoreBtn');
  const closeBtn = modal.querySelector('#closeBtn');
  
  buyMoreBtn?.addEventListener('click', () => {
    document.body.removeChild(modal);
    onBuyMore();
  });
  
  closeBtn?.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

/**
 * Guard function for download operations
 * Returns true if download should proceed, false otherwise
 */
export async function guardDownload(
  requiredCredits: number, 
  onBuyMore: () => void
): Promise<boolean> {
  const result = checkCredits(requiredCredits);
  
  if (!result.hasEnoughCredits) {
    showInsufficientCreditsAlert(result, onBuyMore);
    return false;
  }
  
  return true;
}

/**
 * Add CSS animations
 * Call this once in your main App component
 */
export function injectCreditCheckerStyles() {
  if (document.getElementById('credit-checker-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'credit-checker-styles';
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes scaleIn {
      from { 
        opacity: 0;
        transform: scale(0.9);
      }
      to { 
        opacity: 1;
        transform: scale(1);
      }
    }
    
    .animate-fadeIn {
      animation: fadeIn 0.2s ease-out;
    }
    
    .animate-scaleIn {
      animation: scaleIn 0.3s ease-out;
    }
  `;
  
  document.head.appendChild(style);
}