<!DOCTYPE html>
<html lang="ar" dir="rtl">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="robots" content="noindex, nofollow">

        {{-- Theme before first paint (same rule as hooks/use-appearance): saved choice, else dark. --}}
        <script>
            (function () {
                var a = 'dark';
                try { a = localStorage.getItem('appearance') || 'dark'; } catch (e) {}
                var dark = a === 'dark' || (a === 'system' && matchMedia('(prefers-color-scheme: dark)').matches) || (a !== 'light' && a !== 'system');
                document.documentElement.classList.toggle('dark', dark);
            })();
        </script>

        <title inertia>{{ config('app.name', 'Laravel') }}</title>
        <link rel="icon" href="/brand-favicon.svg" type="image/svg+xml">

        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
