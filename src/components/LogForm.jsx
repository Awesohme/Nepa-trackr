export default function LogForm({ onOpenManual }) {
  return (
    <button
      onClick={onOpenManual}
      className="w-full btn-quiet py-3.5 text-base"
    >
      Log Manual Entry
    </button>
  );
}
