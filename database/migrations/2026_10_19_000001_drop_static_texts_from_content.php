<?php

use App\Support\SiteContent;
use Illuminate\Database\Migrations\Migration;

/**
 * Interface texts the editor no longer offers (labels, buttons, counts, the
 * screen-reader-only ones) lose their saved copies, so the site shows its own
 * bundled text for them and picks up any change made there.
 */
return new class extends Migration
{
    private const TEXTS = [
        'common.scrollDown', 'common.cta', 'common.cursor', 'common.notFound.eyebrow', 'common.notFound.cta',
        'navigation.work', 'navigation.contact', 'navigation.privacy', 'navigation.openMenu', 'navigation.closeMenu', 'navigation.menuPromptLink',
        'home.caseList.cta',
        'work.statProjects', 'work.statFields', 'work.filterAll', 'work.askCta', 'work.next',
        'work.metaClient', 'work.metaYear', 'work.metaCategory', 'work.metaServices',
        'work.challenge', 'work.challengeKicker', 'work.solution', 'work.solutionKicker', 'work.result', 'work.resultKicker',
        'work.missingTitle', 'work.missingSub', 'work.missingBack',
        'contact.tabs', 'contact.copyEmail', 'contact.city', 'contact.whatsappCta',
        'contact.form.fields', 'contact.form.consentBefore', 'contact.form.consentLink', 'contact.form.consentAfter',
        'contact.form.submit', 'contact.form.thx', 'contact.form.invalid', 'contact.form.failed',
        'footer.cta', 'footer.copyright',
        // Screen-reader labels the editor never offered, saved by the first import.
        'navigation.skipToContent', 'navigation.menuAria', 'navigation.menuNavAria',
        'contact.tabsAria', 'work.filtersAria', 'home.about.aria', 'home.workReel.aria',
    ];

    public function up(): void
    {
        if (($messages = SiteContent::get('messages')) !== null) {
            foreach (array_keys($messages) as $locale) {
                foreach (self::TEXTS as $key) {
                    data_forget($messages, "{$locale}.{$key}");
                }
            }
            SiteContent::put('messages', $messages);
        }

        // The 404 button always leads home now.
        if (($home = SiteContent::get('home')) !== null && array_key_exists('notFoundHref', $home)) {
            unset($home['notFoundHref']);
            SiteContent::put('home', $home);
        }
    }

    public function down(): void
    {
        //
    }
};
