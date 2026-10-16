import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { isDarkAppearance, useAppearance } from '@/hooks/use-appearance';
import { Moon, Sun } from 'lucide-react';

/** One click flips the dashboard between the light and dark themes. */
export function AppearanceToggle({ className }: { className?: string }) {
    const { appearance, updateAppearance } = useAppearance();
    const dark = isDarkAppearance(appearance);
    const label = dark ? 'الوضع الفاتح' : 'الوضع الداكن';

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={className}
                    onClick={() => updateAppearance(dark ? 'light' : 'dark')}
                    aria-label={label}
                >
                    {dark ? <Sun /> : <Moon />}
                </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}
