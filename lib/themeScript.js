// Runs in <head> before the page paints, so dark mode never flashes white (used by app/layout.js).
// Same storage key as components/theme.js.
export const THEME_BOOT_SCRIPT = "try{var t=localStorage.getItem('rn-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}";
