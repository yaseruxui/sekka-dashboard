<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContactMessage extends Model
{
    protected $fillable = ['name', 'company', 'email', 'message', 'estimated_budget', 'locale', 'page_uri', 'submitted_at', 'read_at'];

    protected $casts = ['submitted_at' => 'datetime', 'read_at' => 'datetime'];
}
