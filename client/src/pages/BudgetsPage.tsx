import { useAuth } from '../context/AuthContext.tsx';
import ChildBudgetsView from './ChildBudgetsView.tsx';
import BudgetsSection from '../components/settings/BudgetsSection.tsx';
import type { UserSettings } from '../types/index.ts';

interface Props {
  year: number;
  month: number; // 0-indexed
  settings: UserSettings;
}

export default function BudgetsPage({ year, month, settings }: Props) {
  const { isChild } = useAuth();

  if (isChild) {
    return <ChildBudgetsView settings={settings} year={year} month={month} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <BudgetsSection year={year} month={month} settings={settings} />
    </div>
  );
}

