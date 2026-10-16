import { Appearance, useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';
import { LucideIcon, Monitor, Moon, Sun } from 'lucide-react';
import { HTMLAttributes } from 'react';

export default function AppearanceToggleTab({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
    const { appearance, updateAppearance } = useAppearance();

    const tabs: { value: Appearance; icon: LucideIcon; label: string }[] = [
        { value: 'light', icon: Sun, label: 'فاتح' },
        { value: 'dark', icon: Moon, label: 'داكن' },
        { value: 'system', icon: Monitor, label: 'حسب الجهاز' },
    ];

    return (
        <div className={cn('bg-muted inline-flex gap-1 rounded-lg p-1', className)} {...props}>
            {tabs.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    type="button"
                    onClick={() => updateAppearance(value)}
                    className={cn(
                        'flex items-center gap-1.5 rounded-md px-3.5 py-1.5 transition-colors',
                        appearance === value ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
                    )}
                >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm">{label}</span>
                </button>
            ))}
        </div>
    );
}
