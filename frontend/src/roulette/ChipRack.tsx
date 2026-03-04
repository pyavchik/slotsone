import { useRouletteStore } from '@/stores/rouletteStore';
import type { ChipDef } from './types';
import './chipRack.css';

const CHIPS: ChipDef[] = [
  { value: 1, label: '$1', image: '/assets/roulette/pro/chip-1.png' },
  { value: 5, label: '$5', image: '/assets/roulette/pro/chip-5.png' },
  { value: 10, label: '$10', image: '/assets/roulette/pro/chip-10.png' },
  { value: 25, label: '$25', image: '/assets/roulette/pro/chip-25.png' },
  { value: 50, label: '$50', image: '/assets/roulette/pro/chip-50.png' },
  { value: 100, label: '$100', image: '/assets/roulette/pro/chip-100.png' },
];

export default function ChipRack() {
  const balance = useRouletteStore((s) => s.balance);
  const selectedChipValue = useRouletteStore((s) => s.selectedChipValue);
  const setChipValue = useRouletteStore((s) => s.setChipValue);

  return (
    <div className="cr-rack">
      {CHIPS.map((chip) => {
        const isSelected = selectedChipValue === chip.value;
        const isDisabled = chip.value > balance;

        return (
          <button
            key={chip.value}
            className={
              'cr-chip-btn' +
              (isSelected ? ' cr-chip-btn--selected' : '') +
              (isDisabled ? ' cr-chip-btn--disabled' : '')
            }
            disabled={isDisabled}
            onClick={() => setChipValue(chip.value)}
          >
            <img
              className="cr-chip-img"
              src={chip.image}
              alt={chip.label + ' chip'}
              draggable={false}
            />
          </button>
        );
      })}
    </div>
  );
}
