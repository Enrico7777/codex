/**
 * State Management - Zentrale State-Verwaltung für App & Volksentscheid
 * Redux-ähnliches Pattern für nahtlose Datenverwaltung
 */

import type { VotingUIState } from './volksentscheid-ui';
import type { RegistrationApplication } from './types';

export interface AppState {
  // User Session
  userId: string | null;
  isAuthenticated: boolean;
  sessionStartTime: string;

  // Registration Flow
  registration: {
    applicationId: string | null;
    currentStep: 'personal' | 'dependents' | 'criminal-record' | 'review' | 'submitted';
    data: Partial<RegistrationApplication>;
    isValid: boolean;
    errors: string[];
  };

  // Eligibility Check
  eligibility: {
    eligible: boolean;
    baseSpaceM2: number;
    totalSpaceAllowed: number;
    maxOccupants: number;
    restrictions: string[];
    warnings: string[];
  };

  // Housing Unit Selection
  housing: {
    selectedUnitId: string | null;
    availableUnits: string[];
    cluster: string | null;
    reservationId: string | null;
  };

  // Volksentscheid Voting
  voting: VotingUIState & {
    voterId: string | null;
    isVerified: boolean;
    hasVoted: boolean;
    digitalSignature: string | null;
    encryptedVote: string | null;
  };

  // Personal Calculator Data
  calculator: {
    monthlyIncome: number | null;
    calculatedSavings: {
      monthly: number;
      yearly: number;
      lifetime: number;
    } | null;
    displayMode: '3d-model' | 'chart' | 'detailed';
  };

  // UI State
  ui: {
    scrollProgress: number;
    currentSection: string;
    animationsEnabled: boolean;
    theme: 'light' | 'dark';
  };

  // Error Handling
  errors: {
    globalError: string | null;
    fieldErrors: Record<string, string>;
    lastErrorTime: string | null;
  };
}

export type AppAction =
  | { type: 'SET_USER'; payload: string }
  | { type: 'AUTHENTICATE' }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_REGISTRATION'; payload: Partial<AppState['registration']> }
  | { type: 'UPDATE_ELIGIBILITY'; payload: Partial<AppState['eligibility']> }
  | { type: 'SELECT_UNIT'; payload: string }
  | { type: 'UPDATE_VOTER_DATA'; payload: Partial<AppState['voting']> }
  | { type: 'UPDATE_CALCULATOR'; payload: Partial<AppState['calculator']> }
  | { type: 'UPDATE_SCROLL_PROGRESS'; payload: number }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_STATE' };

const initialState: AppState = {
  userId: null,
  isAuthenticated: false,
  sessionStartTime: new Date().toISOString(),

  registration: {
    applicationId: null,
    currentStep: 'personal',
    data: {},
    isValid: false,
    errors: [],
  },

  eligibility: {
    eligible: false,
    baseSpaceM2: 0,
    totalSpaceAllowed: 0,
    maxOccupants: 0,
    restrictions: [],
    warnings: [],
  },

  housing: {
    selectedUnitId: null,
    availableUnits: [],
    cluster: null,
    reservationId: null,
  },

  voting: {
    currentSection: 'welcome',
    scrollProgress: 0,
    selectedArguments: [],
    voterId: null,
    isVerified: false,
    hasVoted: false,
    digitalSignature: null,
    encryptedVote: null,
  },

  calculator: {
    monthlyIncome: null,
    calculatedSavings: null,
    displayMode: '3d-model',
  },

  ui: {
    scrollProgress: 0,
    currentSection: 'welcome',
    animationsEnabled: true,
    theme: 'light',
  },

  errors: {
    globalError: null,
    fieldErrors: {},
    lastErrorTime: null,
  },
};

export class AppStore {
  private state: AppState = JSON.parse(JSON.stringify(initialState));
  private listeners: Set<(state: AppState) => void> = new Set();
  private actionHistory: AppAction[] = [];

  /**
   * State abrufen
   */
  getState(): AppState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Action dispatchen
   */
  dispatch(action: AppAction): void {
    this.state = this.reduce(this.state, action);
    this.actionHistory.push(action);
    this.notifyListeners();
    console.log(`[Store] Action: ${action.type}`, action);
  }

  /**
   * Reducer - Pure Function
   */
  private reduce(state: AppState, action: AppAction): AppState {
    switch (action.type) {
      case 'SET_USER':
        return { ...state, userId: action.payload };

      case 'AUTHENTICATE':
        return { ...state, isAuthenticated: true };

      case 'LOGOUT':
        return { ...state, isAuthenticated: false, userId: null };

      case 'UPDATE_REGISTRATION':
        return {
          ...state,
          registration: { ...state.registration, ...action.payload },
        };

      case 'UPDATE_ELIGIBILITY':
        return {
          ...state,
          eligibility: { ...state.eligibility, ...action.payload },
        };

      case 'SELECT_UNIT':
        return {
          ...state,
          housing: { ...state.housing, selectedUnitId: action.payload },
        };

      case 'UPDATE_VOTER_DATA':
        return {
          ...state,
          voting: { ...state.voting, ...action.payload },
        };

      case 'UPDATE_CALCULATOR':
        return {
          ...state,
          calculator: { ...state.calculator, ...action.payload },
        };

      case 'UPDATE_SCROLL_PROGRESS':
        return {
          ...state,
          ui: { ...state.ui, scrollProgress: action.payload },
        };

      case 'SET_ERROR':
        return {
          ...state,
          errors: {
            ...state.errors,
            globalError: action.payload,
            lastErrorTime: new Date().toISOString(),
          },
        };

      case 'CLEAR_ERROR':
        return {
          ...state,
          errors: { ...state.errors, globalError: null },
        };

      case 'RESET_STATE':
        return JSON.parse(JSON.stringify(initialState));

      default:
        return state;
    }
  }

  /**
   * State-Listener registrieren
   */
  subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Alle Listener benachrichtigen
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.getState()));
  }

  /**
   * Persistierung (LocalStorage)
   */
  saveToLocalStorage(key: string = 'base44-app-state'): void {
    localStorage.setItem(key, JSON.stringify(this.state));
    console.log('✓ State saved to localStorage');
  }

  /**
   * Wiederherstellung
   */
  loadFromLocalStorage(key: string = 'base44-app-state'): void {
    const saved = localStorage.getItem(key);
    if (saved) {
      this.state = JSON.parse(saved);
      this.notifyListeners();
      console.log('✓ State loaded from localStorage');
    }
  }

  /**
   * Action-History abrufen (für Audit/Debugging)
   */
  getActionHistory(): AppAction[] {
    return [...this.actionHistory];
  }

  /**
   * Nahtlose Kalkulator → 3D-Modell Verbindung
   */
  syncCalculatorTo3DModel(): {
    monthlyIncome: number;
    monthlySavings: number;
    yearlySavings: number;
    lifeTimeValue: number;
  } | null {
    const { calculator } = this.state;
    if (!calculator.monthlyIncome || !calculator.calculatedSavings) {
      return null;
    }

    return {
      monthlyIncome: calculator.monthlyIncome,
      monthlySavings: calculator.calculatedSavings.monthly,
      yearlySavings: calculator.calculatedSavings.yearly,
      lifeTimeValue: calculator.calculatedSavings.lifetime,
    };
  }

  /**
   * Voting-Daten mit Digital Signature vor Übertragung
   */
  prepareVoteForSubmission(): {
    voterId: string;
    vote: 'JA' | 'NEIN' | 'ENTHALTUNG';
    timestamp: string;
    signature: string;
  } | null {
    const { voting } = this.state;

    if (!voting.voterId || !voting.vote || !voting.digitalSignature) {
      return null;
    }

    return {
      voterId: voting.voterId,
      vote: voting.vote as 'JA' | 'NEIN' | 'ENTHALTUNG',
      timestamp: new Date().toISOString(),
      signature: voting.digitalSignature,
    };
  }
}

// Singleton Instance
export const appStore = new AppStore();
