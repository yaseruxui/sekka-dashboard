import { BrandLogo } from '@/components/brand-logo';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#0A55FB] text-white shadow-sm">
                <BrandLogo variant="wordmark" className="h-3.5" />
            </div>
            <div className="ms-1 grid flex-1 text-start text-sm">
                <BrandLogo className="h-7 text-[#0A55FB] dark:text-white" />
            </div>
        </>
    );
}
