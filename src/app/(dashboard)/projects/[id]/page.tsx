'use client';

import { useParams } from 'next/navigation';
import { ProjectDetail } from '@/features/projects/components/project-detail';

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  return params?.id ? <ProjectDetail key={params.id} projectId={params.id} /> : null;
}
