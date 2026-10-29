import type { UserSettings } from '../types/index.ts';
import PreferencesSection from '../components/settings/PreferencesSection.tsx';
import CurrencySection from '../components/settings/CurrencySection.tsx';
import CategoriesSection from '../components/settings/CategoriesSection.tsx';
import AccountsSection from '../components/settings/AccountsSection.tsx';
import BudgetsSection from '../components/settings/BudgetsSection.tsx';

interface Props {
  year: number;
  month: number; // 0-indexed
  settings: UserSettings;
  onUpdate: (patch: Partial<UserSettings>) => void;
}

export default function SettingsPage({ year, month, settings, onUpdate }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <PreferencesSection settings={settings} onUpdate={onUpdate} />
      <CurrencySection settings={settings} onUpdate={onUpdate} />
      <CategoriesSection />
      <AccountsSection settings={settings} />
      <BudgetsSection year={year} month={month} settings={settings} />
    </div>
  );
}
