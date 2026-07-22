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
          className="rounded-full border border-bubbleUser px-3 py-1.5 text-sm text-bubbleUser active:bg-bubbleUser active:text-white"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
