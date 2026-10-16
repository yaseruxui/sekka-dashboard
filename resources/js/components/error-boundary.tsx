import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { TriangleAlert } from 'lucide-react';
import { Component, type ReactNode } from 'react';

type Fallback = (props: { error: Error; reset: () => void }) => ReactNode;

interface Props {
    children: ReactNode;
    fallback: Fallback;
    /** A new value clears the error (e.g. the page URL, so navigating away recovers). */
    resetKey?: unknown;
}

/**
 * Keeps a render crash inside one part of the screen. React already logs
 * caught errors to the console, so nothing is logged here.
 */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
    state: { error: Error | null } = { error: null };

    static getDerivedStateFromError(error: unknown) {
        return { error: error instanceof Error ? error : new Error(String(error)) };
    }

    componentDidUpdate(prev: Props) {
        if (this.state.error && !Object.is(prev.resetKey, this.props.resetKey)) this.setState({ error: null });
    }

    reset = () => this.setState({ error: null });

    render() {
        const { error } = this.state;
        return error ? this.props.fallback({ error, reset: this.reset }) : this.props.children;
    }
}

const reload = () => window.location.reload();

/** Whole screen, when even the layout failed. */
export const AppError: Fallback = () => (
    <div className="flex min-h-svh items-center justify-center p-6">
        <EmptyState
            icon={TriangleAlert}
            title="حدث خطأ غير متوقع"
            description="أعد تحميل الصفحة، وإن تكرّر الخطأ فتواصل مع الدعم."
            action={<Button onClick={reload}>إعادة تحميل الصفحة</Button>}
            className="w-full max-w-md"
        />
    </div>
);

/** A page's content, inside the shell (sidebar and header stay usable). */
export const PageError: Fallback = () => (
    <div className="max-w-page mx-auto w-full p-4 md:p-8">
        <EmptyState
            icon={TriangleAlert}
            title="تعذّر عرض هذه الصفحة"
            description="حدث خطأ غير متوقع. أعد تحميل الصفحة أو انتقل إلى صفحة أخرى من القائمة."
            action={
                <Button variant="outline" onClick={reload}>
                    إعادة تحميل الصفحة
                </Button>
            }
        />
    </div>
);

/** One widget (a preview, a card); the rest of the page keeps working. */
export const WidgetError: Fallback = ({ reset }) => (
    <EmptyState
        icon={TriangleAlert}
        title="تعذّر عرض هذا الجزء"
        description="بقية الصفحة تعمل. أعد المحاولة، وإن تكرّر الخطأ فأعد تحميل الصفحة."
        action={
            <Button variant="outline" size="sm" onClick={reset}>
                إعادة المحاولة
            </Button>
        }
        className="py-8"
    />
);
