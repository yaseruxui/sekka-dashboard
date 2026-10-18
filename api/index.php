<?php

define('LARAVEL_START', microtime(true));

// Serve static files from public/ when requested directly.
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
$publicPath = __DIR__ . '/../public' . $uri;

if ($uri !== '/' && file_exists($publicPath) && !is_dir($publicPath)) {
    $mimeTypes = [
        'css'  => 'text/css',
        'js'   => 'application/javascript',
        'json' => 'application/json',
        'svg'  => 'image/svg+xml',
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif'  => 'image/gif',
        'ico'  => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2'=> 'font/woff2',
        'ttf'  => 'font/ttf',
        'otf'  => 'font/otf',
        'txt'  => 'text/plain',
    ];
    $ext = strtolower(pathinfo($publicPath, PATHINFO_EXTENSION));
    $mime = $mimeTypes[$ext] ?? (mime_content_type($publicPath) ?: 'application/octet-stream');

    header("Content-Type: $mime");
    if (in_array($ext, ['css', 'js', 'svg', 'png', 'jpg', 'jpeg', 'gif', 'woff', 'woff2', 'ttf', 'otf'])) {
        header('Cache-Control: public, max-age=31536000, immutable');
    }
    readfile($publicPath);
    exit;
}

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
