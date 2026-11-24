// ─────────────────────────────────────────────────────────────────────────────
//  This is the only file you need to edit.  تنها فایلی که لازمه تغییر بدی همینه.
//
//  - Text with { fa, en } is shown in the matching language.
//  - Leave a value as "" (empty) to hide that part of the page.
//  - Never put passwords, tokens or API keys here: this file is public.
//    Those go in Cloudflare as secrets (see README).
// ─────────────────────────────────────────────────────────────────────────────
export default {
  // ── Who you are ──
  name: "PELAK", //           big title, browser tab, share preview
  shortName: "Pelak", //          name under the icon when installed on a phone
  tagline: {
    fa: "اینجا همه‌ی لینک‌ها، ویدیوها و پروژه‌های من یک‌جا جمع شده",
    en: "All my links, videos and projects in one place"
  },
  description: {
    fa: "لینک‌ها، ویدیوها و پروژه‌های من",
    en: "My links, videos and projects"
  },
  signature: "built with love and caffeine", // small line at the bottom of the side bar
  cardSubtitle: "LINKS · VIDEOS · CODE", //     line on the visitor card image
  showCredit: true, //            small "made with Pelak" link; false removes it

  // ── Languages ──
  languages: ["fa", "en"], //     ["fa"] or ["en"] for a single language (hides the switch)
  defaultLang: "fa",

  // ── Social accounts: username only, without @ or https:// ──
  // The four big tiles. "telegram", "YouTube"... are only samples: put your own, or "" to hide one.
  // Members / subscribers / stars are fetched automatically.
  social: {
    telegram: "@pdnczone", //      public channel username
    youtube: "YouTube", //        channel handle
    instagram: "@pdnczone",
    github: "github",
    featuredRepo: "docs" //       one of your GitHub repositories to show as a card, "" to hide it
  },

  // ── Any other link you want ──
  // id    : used in the address, so id "website" also works as your-site.com/website
  // icon  : code | globe | mail | chat | x | discord | linkedin | store | star
  // color : red,green,blue
  // handle: optional text with a copy button
  links: [
    { id: "website", label: { fa: "وب‌سایت", en: "Website" }, url: "https://example.com", icon: "globe", color: "139,92,246", handle: "" },
    { id: "email", label: { fa: "ایمیل", en: "Email" }, url: "mailto:hello@example.com", icon: "mail", color: "74,222,128", handle: "hello@example.com" }
  ],

  // ── Donation card ──
  donate: {
    enabled: false,
    title: { fa: "حمایت از من", en: "Support me" },
    goalName: { fa: "تجهیزات جدید", en: "New gear" }, // Reymit's own goal name wins when connected
    goal: 10000000, //            goal amount
    currency: { fa: "تومان", en: "Toman" },
    button: { label: { fa: "حمایت", en: "Donate" }, url: "https://example.com/donate" }, // url "" hides the button
    crypto: { label: { fa: "کریپتو ⚡", en: "Crypto ⚡" }, url: "" }
  },

  // ── Turn parts of the page on / off ──
  sections: {
    videos: true, //        latest YouTube videos
    posts: true, //         latest Telegram channel posts
    project: true, //       featured GitHub project
    tip: true, //           Linux tip of the day (edit the tips in public/tips.js)
    guestbook: true,
    map: true, //           visitors globe
    snake: true, //         snake game with a shared leaderboard
    terminal: true,
    achievements: true,
    visitorCard: true,
    qr: true
  },

  // ── Look ──
  theme: {
    // null = colours follow the visitor's time of day.
    // For fixed colours: { a1: [47, 139, 255], a2: [139, 92, 246] }  (red, green, blue)
    accent: null
  },
  hubCountry: "DE", //     lines on the globe fly to this country (two-letter code)
  hubLabel: "HQ",
  terminalUser: "guest", // shown as guest@pelak in the terminal

  // ── Optional ──
  securityContact: "" //   "mailto:you@example.com" or "https://t.me/you", used in /.well-known/security.txt
};
