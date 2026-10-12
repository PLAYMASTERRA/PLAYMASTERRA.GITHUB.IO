# PLAYMASTER RA — Official Editorial Creator Website & Full Admin CMS

Welcome to the complete, production-ready source code for **PLAYMASTER RA** (`https://youtube.com/@playmasterra`).

Yeh project ek **world-class editorial creator website** (`index.html`) aur ek **dedicated, secure Admin CMS Studio** (`admin/index.html`) ka complete package hai — jisse aap bina code edit kiye ya website dobara deploy kiye apne YouTube videos, custom 16:9 thumbnails, gaming categories (**BUSSID**, **Car Parking Multiplayer**, **Gaming Challenges**, **Gaming Stories**), homepage text, aur announcements manage kar sakte hain.

---

## 1. Folder Structure (Project Ki Files)

```text
/
├── index.html                  # Complete Public Editorial Website (PLAYMASTER RA)
├── styles.css                  # Editorial Light-Mode Design System & Responsive CSS
├── script.js                   # Public Website Dynamic Loader, Filters & Theatre Modal
├── 404.html                    # Custom Editorial 404 Page (GitHub Pages compatible)
├── config.js                   # Shared Config, YouTube URL Parser, Supabase + Local Sync Engine
├── admin/
│   ├── index.html              # Dedicated Admin CMS Panel (/admin/)
│   ├── admin.css               # Clean, Fast Admin Studio Stylesheet
│   └── admin.js                # Full Admin Logic (Videos, Thumbnail Studio, Homepage Editor, Auth)
├── assets/
│   ├── favicon.svg             # Original PLAYMASTER RA Monogram & Play Emblem Favicon
│   ├── og-cover.svg            # Open Graph Social Share Banner (1200x630)
│   ├── hero-cinema.svg         # Bespoke Editorial Highway & Gaming Illustration
│   ├── cat-bussid.svg          # 01 // BUSSID Category Artwork
│   ├── cat-cpm.svg             # 02 // Car Parking Multiplayer Category Artwork
│   ├── cat-challenges.svg      # 03 // Gaming Challenges Category Artwork
│   └── cat-stories.svg         # 04 // Gaming Stories Category Artwork
├── supabase/
│   └── schema.sql              # Complete PostgreSQL Schema, Indexes, Triggers, RLS & Storage Policies
└── README.md                   # Complete Setup, Deployment, Testing & Troubleshooting Guide (Hinglish)
```

---

## 2. Design Philosophy (Dhruv Rathee Reference Adaptation)

Humne `https://www.dhruvrathee.com/` ke editorial layout, typography rhythm, numbered section hierarchy (`01`, `02`, `03`...), aur clean content presentation ko carefully study karke **PLAYMASTER RA** ke liye ek original design banaya hai:

- **Warm Editorial Paper Canvas (`#FAF8F5`) & Pure Cards (`#FFFFFF`)**: Generic dark/neon gaming template ke bajaye ek clean, magazine-grade creator brand feel.
- **Expressive Editorial Typography**: Geometric sans-serif (`Plus Jakarta Sans`) ke saath italic editorial serif (`Instrument Serif` / `Georgia`) ka contrast — jaise *"Gaming. Stories. Adventures."*
- **Zero Fake Data**: Koi bhi fake subscriber count, fake views, fake email address, ya fake video URLs nahi daale gaye hain. Sirf aapka real channel (`https://youtube.com/@playmasterra`) aur editable sections hain.
- **No Creator Face Photo Required**: Website custom editorial illustrations, viewfinder framing, aur gaming artwork ke saath 100% complete lagti hai.

---

## 3. Supabase Setup Instructions (Beginner-Friendly Hinglish)

GitHub Pages ek **static hosting platform** hai (wahan private backend server code nahi chalta). Isliye persistent database, secure admin login, aur image storage ke liye hum **Supabase (Free Tier)** use karte hain.

> **Tip (Instant Local Studio Mode):** Jab tak aap Supabase keys connect nahi karte, tab tak yeh website automatically **Local Studio Persistence Mode** mein kaam karti hai — yaani aap abhi turant `/admin/` khol kar videos add aur publish karke live website par dekh sakte hain!

### Step 1: Supabase Project Banayein
1. [https://supabase.com](https://supabase.com) par free account banayein aur **New Project** par click karein.
2. Project ka naam `playmaster-ra-cms` rakhein, ek strong database password save karein, aur region (e.g., `Mumbai / ap-south-1`) select karein.

### Step 2: Database Tables & Security Policies (`schema.sql`) Run Karein
1. Supabase Dashboard ke left sidebar mein **SQL Editor** par click karein.
2. **New Query** par click karein.
3. Is project ki `supabase/schema.sql` file ka poora code copy karke SQL Editor mein paste karein aur **Run** dabayein.
4. Isse aapke saare tables (`admin_users`, `categories`, `videos`, `thumbnails`, `homepage_settings`, `announcements`, `social_links`), Row Level Security (RLS) policies, aur `website-media` Storage Bucket automatically ban jayenge!

---

## 4. Initial Authorized Admin Account Setup (Pehla Admin Kaise Banayein)

Security ke liye sirf wohi account content edit kar sakta hai jo Supabase Auth mein bhi ho **AUR** `public.admin_users` table mein bhi authorized ho:

1. Supabase Dashboard mein **Authentication &rarr; Users** par jayein.
2. **Add User &rarr; Create New User** par click karein.
3. Apna Admin Email aur Strong Password enter karein, **"Auto Confirm User"** tick karein, aur **Create User** par click karein.
4. Ab **SQL Editor** mein jaakar yeh chhota sa SQL command run karein (apna email replace karke):

```sql
INSERT INTO public.admin_users (user_id, email, role, is_active)
SELECT id, email, 'owner', true
FROM auth.users
WHERE email = 'aapka-email@example.com'
ON CONFLICT (user_id) DO UPDATE SET is_active = true;
```

Ab aapka account officially **Authorized Admin** ban gaya hai! Koi bhi unauthorized visitor database mein kuch bhi write/edit nahi kar payega aur na hi aapke unpublished drafts dekh payega.

---

## 5. Configuration Instructions (`config.js` ya Admin Settings UI)

Supabase ko website se connect karne ke 2 aasan tarike hain:

### Tarika A: Admin Panel UI Se (No Code Editing)
1. `/admin/` page kholein.
2. Login screen ke neeche **"Configure Supabase Connection"** par click karein (ya login ke baad **Website Settings** tab mein jayein).
3. Supabase Dashboard &rarr; **Project Settings &rarr; API** se apna:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **Project API Keys &rarr; `anon` `public` key** copy karke paste karein aur **Save** karein.

### Tarika B: `config.js` File Mein (GitHub Pages Deploy Ke Liye Best)
`config.js` file kholein aur line 16–17 par apna public URL aur public `anon` key paste kar dein:

```javascript
window.PLAYMASTER_CONFIG = {
  brandName: 'PLAYMASTER RA',
  youtubeChannelUrl: 'https://youtube.com/@playmasterra',
  youtubeHandle: '@playmasterra',
  supabaseUrl: 'https://YOUR-PROJECT-ID.supabase.co',
  supabaseAnonKey: 'YOUR-PUBLIC-ANON-KEY',
  storageBucket: 'website-media'
};
```

> **SECURITY RULE:** Kabhi bhi apni `service_role` (secret) key frontend code ya `config.js` mein mat daalein! Sirf `anon` (public) key use karein — kyunki humari RLS policies database ko protect karti hain.

### Free-Tier Limitations (Jo Aapko Pata Hona Chahiye)
- **Supabase Free Tier**: 500 MB database space, 1 GB Storage space (`website-media` bucket mein humne 5 MB per image limit lagayi hai), aur 50,000 monthly active users milte hain. Agar 7 din tak project par koi traffic na ho toh free project pause ho sakta hai (dashboard se 1 click mein resume ho jata hai).
- **YouTube Metadata**: Bina paid YouTube Data API key ke browser directly video ka title/description fetch nahi kar sakta, isliye humारा URL parser YouTube link se **11-character Video ID** aur **Standard 16:9 YouTube Thumbnail URL** automatically nikaal leta hai, aur Title/Description aap manually enter karte hain.

---

## 6. GitHub Pages Deployment Instructions (Website Live Kaise Karein)

1. [https://github.com](https://github.com) par login karein aur **New Repository** banayein (e.g., `playmaster-ra-website`).
2. Is project ki saari files (`index.html`, `styles.css`, `script.js`, `404.html`, `config.js`, `admin/`, `assets/`, `supabase/`, `README.md`) repository mein upload/push karein.
3. Repository ke **Settings &rarr; Pages** tab mein jayein.
4. **Build and deployment** ke andar:
   - **Source**: `Deploy from a branch` select karein.
   - **Branch**: `main` (aur folder `/ (root)`) select karke **Save** par click karein.
5. 1–2 minute mein aapki website live ho jayegi:
   - **Public Website**: `https://your-username.github.io/playmaster-ra-website/`
   - **Admin CMS Panel**: `https://your-username.github.io/playmaster-ra-website/admin/`

---

## 7. End-to-End 12-Step Publishing Workflow (Kaise Use Karein)

Aap bina HTML edit kiye poori website is workflow se chala sakte hain:

1. Browser mein `/admin/` kholein.
2. Apne authorized admin email aur password se **Sign In** karein.
3. Sidebar mein **02 Videos** par click karein aur **+ Add New Video** dabayein.
4. Apna real YouTube URL paste karein (maslan `https://www.youtube.com/watch?v=...`, `https://youtu.be/...`, ya `https://www.youtube.com/shorts/...`) aur **Extract ID & Thumb** dabayein.
5. Video ka **Title** aur **Short Description** likhein.
6. Standard YouTube thumbnail use karein ya **Upload Custom Thumbnail** se apni image lagayein (aur **Focal X / Y** sliders se framing adjust karein).
7. Category (`BUSSID`, `Car Parking Multiplayer`, `Gaming Challenges`, ya `Gaming Stories`) select karein aur **Mark as Featured** tick karein.
8. Right side par **Live Public Card Preview (16:9)** mein card ka exact look check karein.
9. Agar abhi chhupana hai toh **Save as Draft** dabayein, ya live dikhane ke liye **Publish Video to Live Website** dabayein.
10. Data turant database mein save ho jayega aur confirmation toast dikhega.
11. Public website (`index.html`) automatically latest published records load karegi.
12. Visitors ko aapka naya Featured Video aur custom thumbnail turant dikhai dega!

---

## 8. Testing Checklist & Verification Procedure

Humne local environment mein JavaScript syntax, file paths, responsive layout, YouTube URL parser, Draft vs. Published isolation, aur Thumbnail Studio workflows verify kiye hain. Kyunki aapka personal Supabase cloud account aap khud banayenge, deployment ke baad yeh checklist zaroor test karein:

- [ ] **YouTube URL Validation**: `/admin/` &rarr; Videos mein invalid link (e.g. `https://google.com`) daal kar dekhein — clear error message aana chahiye. Ab valid `youtube.com/watch?v=...`, `youtu.be/...`, aur `youtube.com/shorts/...` link daalein — 11-character ID aur thumbnail populate hona chahiye.
- [ ] **Draft Isolation Test**: Ek video ko **Save as Draft** karein. Public homepage (`/`) kholein — woh draft video public site par **bilkul nahi** dikhna chahiye. Ab wapas `/admin/` mein us video par **Publish Live** click karein — ab woh public site par turant dikhna chahiye.
- [ ] **Thumbnail Studio Test**: `/admin/` &rarr; Thumbnails mein ek image upload karein, Fit mode (`cover` / `contain`) aur Focal X/Y sliders move karein — 16:9 preview real-time update hona chahiye. Ek galat image URL daal kar dekhein — red broken-image warning banner aana chahiye.
- [ ] **Homepage Draft vs. Publish**: `/admin/` &rarr; Homepage Editor mein Hero Heading badlein aur **Save Draft Only** dabayein. Normal public homepage (`/`) par purana published heading hi dikhna chahiye, jabki **Preview Draft Site (`/?preview=draft`)** mein naya draft heading dikhna chahiye. Ab **Publish Homepage Changes Live** dabayein — ab public site update ho jayegi.
- [ ] **Delete Confirmation**: Kisi bhi video, category, ya announcement par **Delete** dabayein — bina confirmation modal (`Confirm Delete`) ke kuch delete nahi hona chahiye.
- [ ] **Unconfigured Social Links**: `/admin/` &rarr; Social Links mein Instagram ya Email khaali chhod dein — public website par koi fake link ya broken icon nahi dikhega.

---

## 9. Troubleshooting Guide (Agar Koi Dikkat Aaye)

| Problem | Wajah (Cause) | Solution (Ilaj) |
| :--- | :--- | :--- |
| **Supabase Login par "Access Denied: not registered in public.admin_users" aata hai** | User `auth.users` mein bana hai par `public.admin_users` table mein add nahi hua. | Supabase SQL Editor mein Section 4 wala `INSERT INTO public.admin_users ...` SQL command apne email ke saath run karein. |
| **Custom Thumbnail Upload fail ho raha hai** | Image 5 MB se badi hai ya unsupported format hai. | 5 MB se chhoti JPG, PNG, WebP, GIF, ya SVG file use karein. Agar Supabase use kar rahe hain toh verify karein ki `schema.sql` run ho chuka hai. |
| **Homepage Editor mein save kiya par public website par change nahi dikha** | Aapne **Save Draft Only** dabaya hai. | Public website par sirf Published changes dikhte hain. **Publish Homepage Changes Live** button par click karein. |
| **YouTube URL Invalid bata raha hai** | Link mein `https://` nahi hai ya video ID 11 characters ka nahi hai. | Poora YouTube link copy karein (jaise `https://www.youtube.com/watch?v=xxxxxxxxxxx` ya `https://youtu.be/xxxxxxxxxxx`). |
