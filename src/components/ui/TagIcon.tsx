import { User, Sword, Ghost, Palette, LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  user: User,
  sword: Sword,
  ghost: Ghost,
  palette: Palette,
};

interface TagIconProps {
  iconName: string | null;
  className?: string;
}

export function TagIcon({ iconName, className = "w-4 h-4" }: TagIconProps) {
  if (!iconName) return null;

  const Icon = iconMap[iconName.toLowerCase()];

  if (!Icon) return null;

  return <Icon className={className} />;
}
