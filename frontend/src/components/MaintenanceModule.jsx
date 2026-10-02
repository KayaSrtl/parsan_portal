import { Wrench } from 'lucide-react';
import ComingSoonModule from './ComingSoonModule';

export default function MaintenanceModule({ onBack }) {
  return (
    <ComingSoonModule
      onBack={onBack}
      Icon={Wrench}
      color="purple"
      title="Otonom Bakım Modülü"
      description="Yakında operatör bakım süreçleri ve checklistler buradan yapılabilecektir."
    />
  );
}
