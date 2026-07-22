export function ChoiceChips({
  options,
  onSelect,
}: {
  options: string[];
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 px-3 pb-2">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onSelect(option)}
          className="rounded-full border border-claret px-3 py-1.5 text-sm font-medium text-claret transition-colors active:bg-claret active:text-bone"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
