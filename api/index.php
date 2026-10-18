<?php

define('LARAVEL_START', microtime(true));

// On Vercel serverless, only /tmp is writable.
$storagePath = '/tmp/storage';
foreach ([
    "$storagePath/framework/cache/data",
    "$storagePath/framework/sessions",
    "$storagePath/framework/views",
    "$storagePath/logs",
    "$storagePath/app/public",
] as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

// Copy cached config/routes/views from the build if present.
$buildStorage = __DIR__ . '/../storage';
foreach (['framework/views', 'framework/cache'] as $sub) {
    $src = "$buildStorage/$sub";
    $dst = "$storagePath/$sub";
    if (is_dir($src)) {
        $iter = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($src, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );
        foreach ($iter as $item) {
            $target = $dst . '/' . $iter->getSubPathname();
            if ($item->isDir()) {
                if (!is_dir($target)) mkdir($target, 0755, true);
            } else {
                if (!file_exists($target)) copy($item->getPathname(), $target);
            }
        }
    }
}

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';

// Point storage to writable /tmp.
$app->useStoragePath($storagePath);

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);

$response->send();

$kernel->terminate($request, $response);
