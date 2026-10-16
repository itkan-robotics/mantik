import { lessonUrl } from '@/config/navigation';
import type { DivePrompt } from '@/lib/dive/types';

interface Props {
  index: number;
  prompt: DivePrompt | undefined;
}

export default function DiveRoundLessonLink({ index, prompt }: Props) {
  const label = `Q${index + 1}`;
  const learn = prompt?.learnMore;
  if (!learn) {
    return <strong>{label}</strong>;
  }
  const href = lessonUrl(learn.section, learn.lessonId);
  return (
    <strong>
      <a href={href} className="dive-round-lesson-link">
        {label}
      </a>
    </strong>
  );
}
