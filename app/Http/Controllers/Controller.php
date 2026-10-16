<?php

namespace App\Http\Controllers;

use App\Support\SiteClient;
use Illuminate\Http\RedirectResponse;

abstract class Controller
{
    /**
     * After a change the site shows: asks it to refresh its cache, then goes
     * back with a success toast. The save itself succeeded either way; if the
     * site did not confirm, the overview's site card says so (the change
     * still shows once the site's 5-minute cache runs out).
     */
    protected function savedAndRevalidated(RedirectResponse $redirect, string $message): RedirectResponse
    {
        // After the response is sent: a slow or down site no longer holds up the save (up to 5s).
        dispatch(fn () => SiteClient::revalidate())->afterResponse();

        return $redirect->with('success', $message);
    }
}
