import { Star } from 'lucide-react';

export default function ReviewStars({ value, size = 'w-5 h-5' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${value}/5 sao`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} aria-hidden="true" className={`${size} ${n <= value ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}`} />
      ))}
    </span>
  );
}
