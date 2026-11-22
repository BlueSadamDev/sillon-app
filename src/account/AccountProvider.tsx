// État du compte pour toute l'app : pas de compte, verrouillé ou déverrouillé.
// Verrouille l'app quand elle revient après le délai choisi passé en arrière-plan.
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { afterPaint, argon2id, askBiometrics, biometricsAvailable, newSalt, secureStore } from './device';
import { hashPassword, verifyPassword } from './password';
import { shouldLock } from './rules';
import { ACCOUNT_KEY, DEFAULT_LOCK_DELAY_MIN } from './settings';
import { type Account, parseAccount } from './store';

export type Status = 'loading' | 'none' | 'locked' | 'unlocked';

type AccountState = {
  status: Status;
  username: string;
  biometrics: boolean;
  lockDelayMin: number;
  /** Le téléphone peut utiliser l'empreinte (lecteur présent et empreinte enregistrée). */
  canUseBiometrics: boolean;
  /** Juste après la création du compte : proposer l'empreinte. */
  offerBiometrics: boolean;
  /** Juste après la création du compte (et l'empreinte) : proposer de configurer la sauvegarde. */
  offerBackup: boolean;
  createAccount(username: string, password: string): Promise<void>;
  unlockWithPassword(password: string): Promise<boolean>;
  unlockWithBiometrics(): Promise<boolean>;
  /** Active l'empreinte (après l'avoir vérifiée) ou la désactive. */
  setBiometrics(on: boolean): Promise<boolean>;
  finishOnboarding(): void;
  finishBackupOffer(): void;
  setLockDelay(min: number): Promise<void>;
  changePassword(current: string, next: string): Promise<boolean>;
  /** Efface le compte du coffre (écran Compte, « Effacer toutes les données »). */
  forget(): Promise<void>;
};

const Ctx = createContext<AccountState | null>(null);

export function useAccount(): AccountState {
  const value = useContext(Ctx);
  if (!value) throw new Error('useAccount hors de AccountProvider');
  return value;
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [canUseBiometrics, setCanUseBiometrics] = useState(false);
  const [offerBiometrics, setOfferBiometrics] = useState(false);
  const [offerBackup, setOfferBackup] = useState(false);
  const backgroundSince = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const [saved, bio] = await Promise.all([secureStore.get(ACCOUNT_KEY).then(parseAccount), biometricsAvailable()]);
      setCanUseBiometrics(bio);
      setAccount(saved);
      setStatus(saved ? 'locked' : 'none');
    })();
  }, []);

  const save = useCallback(async (next: Account) => {
    await secureStore.set(ACCOUNT_KEY, JSON.stringify(next));
    setAccount(next);
  }, []);

  // Verrouillage après le délai passé en arrière-plan.
  const delay = account?.lockDelayMin ?? DEFAULT_LOCK_DELAY_MIN;
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundSince.current ??= Date.now();
      } else if (state === 'active') {
        const lock = shouldLock(backgroundSince.current, Date.now(), delay);
        backgroundSince.current = null;
        if (lock) setStatus((s) => (s === 'unlocked' ? 'locked' : s));
        biometricsAvailable().then(setCanUseBiometrics);
      }
    });
    return () => sub.remove();
  }, [delay]);

  const value = useMemo<AccountState>(
    () => ({
      status,
      username: account?.username ?? '',
      biometrics: (account?.biometrics ?? false) && canUseBiometrics,
      lockDelayMin: delay,
      canUseBiometrics,
      offerBiometrics,
      offerBackup,

      async createAccount(username, password) {
        await afterPaint();
        const record = hashPassword(password, argon2id, newSalt());
        await save({ username: username.trim(), password: record, biometrics: false, lockDelayMin: DEFAULT_LOCK_DELAY_MIN });
        setOfferBiometrics(canUseBiometrics);
        setOfferBackup(true);
        setStatus('unlocked');
      },

      async unlockWithPassword(password) {
        if (!account) return false;
        await afterPaint();
        const ok = verifyPassword(password, account.password, argon2id);
        if (ok) setStatus('unlocked');
        return ok;
      },

      async unlockWithBiometrics() {
        if (!account?.biometrics || !canUseBiometrics) return false;
        const ok = await askBiometrics();
        if (ok) setStatus('unlocked');
        return ok;
      },

      async setBiometrics(on) {
        if (!account) return false;
        if (on && !(await askBiometrics())) return false;
        await save({ ...account, biometrics: on });
        return true;
      },

      finishOnboarding() {
        setOfferBiometrics(false);
      },

      finishBackupOffer() {
        setOfferBackup(false);
      },

      async setLockDelay(min) {
        if (account) await save({ ...account, lockDelayMin: min });
      },

      async changePassword(current, next) {
        if (!account) return false;
        await afterPaint();
        if (!verifyPassword(current, account.password, argon2id)) return false;
        await save({ ...account, password: hashPassword(next, argon2id, newSalt()) });
        return true;
      },

      async forget() {
        await secureStore.remove(ACCOUNT_KEY);
        setAccount(null);
        setStatus('none');
      },
    }),
    [account, status, canUseBiometrics, offerBiometrics, offerBackup, delay, save],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
