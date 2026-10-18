<?php

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Serve static files from public/ when requested directly.
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
$publicPath = __DIR__.'/../public'.$uri;

if ($uri !== '/' && file_exists($publicPath) && ! is_dir($publicPath)) {
    $mimeTypes = [
        'css' => 'text/css',
        'js' => 'application/javascript',
        'json' => 'application/json',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'ico' => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf' => 'font/ttf',
        'otf' => 'font/otf',
        'txt' => 'text/plain',
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

// Present the request as if served by public/index.php; otherwise Symfony takes
// this file's "/api" folder as the base path and strips it from /api/* routes.
$_SERVER['SCRIPT_FILENAME'] = realpath(__DIR__.'/../public/index.php');
$_SERVER['SCRIPT_NAME'] = $_SERVER['PHP_SELF'] = '/index.php';

// On Vercel serverless, only /tmp is writable.
$storagePath = '/tmp/storage';
foreach ([
    "$storagePath/framework/cache/data",
    "$storagePath/framework/sessions",
    "$storagePath/framework/views",
    "$storagePath/logs",
    "$storagePath/app/public",
] as $dir) {
    if (! is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

// bootstrap/cache is read-only on Vercel; keep Laravel's generated caches in /tmp.
foreach ([
    'APP_PACKAGES_CACHE' => 'packages.php',
    'APP_SERVICES_CACHE' => 'services.php',
    'APP_CONFIG_CACHE' => 'config.php',
    'APP_ROUTES_CACHE' => 'routes-v7.php',
    'APP_EVENTS_CACHE' => 'events.php',
] as $key => $file) {
    $value = "/tmp/$file";
    putenv("$key=$value");
    $_ENV[$key] = $_SERVER[$key] = $value;
}

require __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';

// Point storage to writable /tmp.
$app->useStoragePath($storagePath);

$kernel = $app->make(Kernel::class);

$response = $kernel->handle(
    $request = Request::capture()
);

$response->send();

$kernel->terminate($request, $response);
