const labels: Record<string, string> = {
  CLEAN: 'Tủ sạch sẽ',
  FAST: 'Mở khóa nhanh',
  EASY_TO_FIND: 'Dễ tìm trạm',
};

export default function ReviewCriteria({ criteria }: { criteria: string }) {
  const selected = criteria.split(',').filter(key => Object.hasOwn(labels, key));
  if (selected.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Tiêu chí được chọn">
      {selected.map(key => <li key={key} className="rounded-full bg-surface-container-low px-2.5 py-1 text-xs font-semibold text-primary">{labels[key]}</li>)}
    </ul>
  );
}
