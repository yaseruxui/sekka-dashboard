<?php

namespace App\Notifications;

use App\Models\ContactMessage;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

/** "New enquiry from the site": sent to everyone who handles the inbox. */
class NewEnquiry extends Notification
{
    public function __construct(private ContactMessage $message) {}

    /** @return list<string> */
    public function via(User $notifiable): array
    {
        return ['database', 'mail'];
    }

    /** The dashboard's notification bell. */
    public function toArray(User $notifiable): array
    {
        $m = $this->message;

        return [
            'title' => "طلب تواصل جديد من {$m->name}",
            'body' => Str::limit((string) $m->message, 120),
            'url' => route('inbox.index', ['open' => $m->id], false),
        ];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $m = $this->message;

        return (new MailMessage)
            ->subject("طلب تواصل جديد من {$m->name}")
            ->greeting("أهلاً {$notifiable->name}،")
            ->line('وصل طلب تواصل جديد من الموقع:')
            ->line("**{$m->name}**".($m->company ? " · {$m->company}" : '')." · {$m->email}")
            ->when($m->estimated_budget, fn ($mail) => $mail->line("الميزانية: {$m->estimated_budget}"))
            ->when($m->message, fn ($mail) => $mail->line('«'.Str::limit($m->message, 300).'»'))
            ->action('افتح الطلب', route('inbox.index', ['open' => $m->id]))
            ->salutation('فريق سكة');
    }
}
