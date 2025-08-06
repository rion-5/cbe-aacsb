// src/app.d.ts
/// <reference types="@sveltejs/kit" />

import type { AppSession } from '$lib/types';

declare global {
  namespace App {
    interface Locals {
      appSession: AppSession;
    }
    // interface Error {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
