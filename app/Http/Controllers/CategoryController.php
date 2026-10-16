<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** The managed list of project fields ("المجالات"). */
class CategoryController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $name = trim((string) $request->validate([
            'name' => ['required', 'string', 'max:120'],
        ])['name']);

        Category::ensure([$name]);

        return response()->json(['name' => $name, 'categories' => Category::names()], 201);
    }
}
