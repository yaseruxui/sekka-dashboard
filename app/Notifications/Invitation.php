<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** "You're invited to the Sekka dashboard": a link to pick a password (valid a week). */
class Invitation extends Notification
{
    public function __construct(private string $token, private string $invitedBy) {}

    /** @return list<string> */
    public function via(User $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $url = route('invitation.show', ['token' => $this->token, 'email' => $notifiable->email]);

        return (new MailMessage)
            ->subject('دعوة إلى لوحة تحكم سكة')
            ->greeting("أهلاً {$notifiable->name}،")
            ->line("{$this->invitedBy} دعاك إلى لوحة تحكم وكالة سكة الإبداعية.")
            ->line('اختر كلمة مرور لحسابك وابدأ مباشرة.')
            ->action('قبول الدعوة', $url)
            ->line('الرابط صالح لمدة 7 أيام. إذا ما كنت تتوقع هذه الدعوة، تجاهل الرسالة.')
            ->salutation('فريق سكة');
    }
}
