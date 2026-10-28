'use client';

import { useParams } from 'next/navigation';
import { PipelinesWorkspace } from '@/features/pipelines/components/pipelines-workspace';

export default function PipelineBoardPage() {
  const { id } = useParams<{ id: string }>();
  return <PipelinesWorkspace pipelineId={id} />;
}
