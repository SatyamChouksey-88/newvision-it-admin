import type { HelpArticle } from './types';

const CAT = 'For employees';

/** Fixed employee FAQ (not a KB engine). Linked from My IT so people look here before raising a ticket. */
export const employeeHowtos: HelpArticle[] = [
  {
    id: 'howto-wifi',
    title: 'Office Wi-Fi (Pune, Hyderabad, Bhopal)',
    category: CAT,
    summary: 'Which network to join at each office, and what to do if it will not connect.',
    keywords: ['wifi', 'wi-fi', 'wlan', 'pune', 'hyderabad', 'bhopal', 'internet'],
    body: `Join the **corporate** network at your site — not the guest SSID, unless you are a visitor.

### Networks

| Office | Staff SSID | Guest SSID |
|--------|------------|------------|
| Pune | \`NV-Pune\` | \`NV-Pune-Guest\` |
| Hyderabad | \`NV-Hyd\` | \`NV-Hyd-Guest\` |
| Bhopal | \`NV-Bhopal\` | \`NV-Bhopal-Guest\` |

Staff Wi-Fi uses your **work email + password** (the same Microsoft 365 sign-in). Guest Wi-Fi is a day pass from reception or IT — do not share the staff password with a visitor.

### Connect (Windows)

1. Click the network icon in the taskbar.
2. Choose the staff SSID for **this** office (the table above).
3. Sign in with your work email. Approve MFA if asked.
4. If Windows asks “Continue connecting?”, choose **Connect**.

### If it will not join

1. Forget the network (Wi-Fi list → the SSID → Forget) and try once more.
2. Confirm you are on the **staff** SSID, not Guest.
3. If you changed your Microsoft password this morning, Wi-Fi still has the old one — Forget and reconnect.
4. Still stuck? Raise a ticket in **Network** from [How to raise a ticket](/help/howto-raise-ticket) and say which office you are in.

> [!NOTE]
> There is no “IT Wi-Fi password” on a whiteboard. Staff authentication is your M365 account.

> [!WARNING]
> Do not use a neighbour’s SSID or a personal hotspot for company email or the shared drive.`,
  },
  {
    id: 'howto-vpn',
    title: 'VPN from home or a hotel',
    category: CAT,
    summary: 'When you need the VPN, how to sign in, and what to send IT if it fails.',
    keywords: ['vpn', 'forticlient', 'remote', 'hotel', 'home', 'split tunnel'],
    body: `Use the **NewVision VPN** (the client already on your laptop) whenever you are off the office Wi-Fi and need the shared drive, an internal site, or a printer at the office.

You do **not** need VPN for Outlook / Teams / NewVision in a browser — those are on the internet.

### Connect

1. Open the VPN client from the Start menu (search “VPN”).
2. Gateway / portal is already filled on a company laptop. If it is empty, raise a ticket — do not guess a URL from chat.
3. Sign in with your **work email**. Approve MFA on your phone.
4. Wait until the client says **Connected**. The shared drive (\`\\\\files\`) only works after that.

### If it will not connect

1. Try office Wi-Fi vs home Wi-Fi vs phone hotspot — one of those often works when a hotel captive portal does not.
2. Complete the hotel “I agree” page in a browser first, then connect VPN.
3. If MFA says “deny”, it was not you — do not approve, and tell IT (see [Phishing](/help/howto-phishing)).
4. Still stuck? Raise a **Network** ticket from [How to raise a ticket](/help/howto-raise-ticket). Write: home/hotel, city, and the exact error text.

> [!TIP]
> Password or MFA problems are not a VPN bug. Use [Lost phone / MFA](/help/howto-mfa) or ask IT for an account reset — they will not reset anything until they verify it is you.`,
  },
  {
    id: 'howto-mfa',
    title: 'Lost phone or MFA prompt',
    category: CAT,
    summary: 'What to do if Authenticator is on a dead or stolen phone, or you never get the prompt.',
    keywords: ['mfa', 'authenticator', 'lost phone', '2fa', 'otp', 'lockout'],
    body: `Microsoft 365 and the VPN ask for **Authenticator** (or a number match) after your password. NewVision login is separate — IT can send a NewVision reset from a ticket, but **M365 / VPN are reset in Entra**, not in this app.

### Lost, stolen, or factory-reset phone

1. Do not try random codes. That can lock the account.
2. From another device or a colleague’s desk, raise a ticket: **Account lockout / password / MFA**.
3. IT will **verify it is you** (employee code + manager or photo ID) before they touch MFA. That check is the difference between a reset and a breach.
4. After they re-register Authenticator, sign in once on the new phone and keep a backup method if IT offers one.

### Prompt never arrives

1. Confirm the phone has data (Wi-Fi or LTE), not airplane mode.
2. Open Authenticator and pull to refresh.
3. If you are abroad, time zone on the phone should be automatic.
4. Still nothing? Same ticket as above.

> [!WARNING]
> IT will not reset MFA from a chat message or a “please reset my password” email. In person or a verified ticket only.

> [!NOTE]
> NewVision’s own password is not your Microsoft password. If only this website fails, say so on the ticket so IT send a NewVision reset link instead of touching M365.`,
  },
  {
    id: 'howto-outlook-search',
    title: 'Outlook search finds nothing',
    category: CAT,
    summary: 'Rebuild the local index before you raise a software ticket.',
    keywords: ['outlook', 'search', 'index', 'mailbox', 'email'],
    body: `If **Search** in Outlook is empty but you can open mail by folder, the local index is usually stuck — not a missing mailbox.

### Try this first (Windows, classic Outlook)

1. File → Options → Search → **Indexing Options**.
2. Confirm Microsoft Outlook is included. If it is excluded, include it and wait 15 minutes.
3. In Outlook: Search tools → **Advanced Find** still empty? Continue.
4. Close Outlook. Windows Settings → Searching Windows → **Advanced indexing options** → Advanced → **Rebuild**.
5. Leave the laptop on and plugged in. A full mailbox can take an hour.

### Still broken

Raise a **Software** ticket from [How to raise a ticket](/help/howto-raise-ticket). Say:

- New Outlook vs classic Outlook
- Cached / Online mode if you know it
- Whether OWA (outlook.office.com in a browser) search works — if OWA works, it is this PC, not the mailbox

> [!TIP]
> Browser Outlook search working + desktop search empty is the usual “rebuild index” case. Mention that; it saves a round trip.`,
  },
  {
    id: 'howto-printer',
    title: 'Add a printer',
    category: CAT,
    summary: 'How to add the floor printer on a company laptop, and when to call IT.',
    keywords: ['printer', 'print', 'add printer', 'ipp', 'queue'],
    body: `Floor printers are named on a sticker (for example \`NV-PUN-PRN-014\`). Use that code in a ticket if you cannot add it yourself.

### Windows

1. Settings → Bluetooth & devices → Printers & scanners → **Add device**.
2. Wait for the office printer list (you must be on [staff Wi-Fi](/help/howto-wifi) or [VPN](/help/howto-vpn)).
3. Pick the printer for **your floor**, set it as default if you want.
4. Print a test page.

### It does not appear

1. Confirm VPN or office Wi-Fi — home Wi-Fi cannot see office printers.
2. Try another nearby PC. If nobody can print, it is the printer (jam/offline), not your laptop.
3. Raise a ticket and include the **printer asset code** from the sticker. If toner is empty, say so — see [Toner](/help/howto-toner).

> [!NOTE]
> Do not install a “HP Smart” store app from a personal Microsoft account. Company queues are already packaged.`,
  },
  {
    id: 'howto-slow-laptop',
    title: 'My laptop is slow',
    category: CAT,
    summary: 'Restart, disk, and when a slow laptop is actually a ticket.',
    keywords: ['slow', 'laptop', 'performance', 'disk', 'startup'],
    body: `Most “my laptop is slow” mornings are a stuck update or a full disk — not a new machine.

### Five minutes

1. **Restart** (not Sleep). Save work first.
2. Settings → System → Storage. If the C: drive is under **10% free**, delete Downloads you do not need and empty Recycle Bin. Do not delete folders you do not recognise.
3. Close Chrome/Edge windows you are not using (each is RAM).
4. Plug in the charger. A nearly-empty battery will throttle.

### Still slow after a restart

Raise a **Hardware-other** (or Software, if it started after an install) ticket from [How to raise a ticket](/help/howto-raise-ticket). Include:

- Asset code on the underside sticker
- When it started (this morning / last week)
- Whether it is slow **on battery only**

> [!WARNING]
> Do not run random “PC cleaner” or registry apps. They cause more tickets than they close.`,
  },
  {
    id: 'howto-raise-ticket',
    title: 'How to raise a ticket',
    category: CAT,
    summary: 'Use My IT → Raise a ticket. Pick the right type so it is not a laptop-request in disguise.',
    keywords: ['ticket', 'helpdesk', 'raise', 'my it', 'support'],
    body: `You do not email a person in IT for a break/fix. You raise a **ticket** so the queue, not a chat scroll, owns it.

### Steps

1. Sign in to NewVision → **My IT** (your home).
2. Click **Raise a ticket**.
3. Pick a category (or a template if IT provided one):
   - **Access & Account** — password, MFA, lockout, shared-drive permission
   - **Network** — Wi-Fi, VPN, “no internet”
   - **Software** — Outlook, Teams, an app install
   - **Hardware-other** — printer jam, slow laptop, accessories
   - **General** — only if nothing else fits
4. Write what you already tried. Asset code from the sticker helps.
5. Submit. You will get the ticket number (TCK-…) and public replies here — not in Teams.

### What is not a ticket

- **I need a new laptop / monitor** → **Request a device**, not a ticket.
- **This specific laptop is physically broken** → report a repair on that asset (Maintenance), or tell IT the asset code in a ticket if you cannot find the button.

> [!TIP]
> Read the how-to for your problem first (Wi-Fi, VPN, MFA). If it still fails, the ticket is already in the right category.`,
  },
  {
    id: 'howto-leaving',
    title: "I'm leaving — return kit",
    category: CAT,
    summary: 'What to hand back on your last day so IT can close the leaver checklist.',
    keywords: ['leaving', 'offboard', 'return', 'leaver', 'last day', 'kit'],
    body: `On your last working day, kit comes back **to IT**, not to your manager’s drawer.

### Bring these

1. Laptop (with charger and any dock/bag that was issued with it).
2. Monitor, headset, or other accessories on your **My kit** list.
3. ID card / access badge if IT issued them.
4. Unlock the laptop once so IT can check it in (BitLocker recovery is not a goodbye gift).

### Before you hand it over

1. Open **My IT** → **My kit** and compare with what is in your bag. Missing a charger? Say so — do not leave a mystery.
2. Copy personal files off the laptop. Company mail stays in M365; IT will disable the login.
3. Do not “format the disk” yourself.

IT runs **Offboard** on your employee record: assets return, login disables, open tickets are reassigned or closed. You do not do that screen.

> [!NOTE]
> If you are moving city, not leaving the company, that is a **move**, not a return. Ask IT to move you — do not ship the laptop in a personal courier without a ticket.`,
  },
  {
    id: 'howto-toner',
    title: 'Toner empty or printer jam',
    category: CAT,
    summary: 'Name the printer from the sticker and say whether toner is empty.',
    keywords: ['toner', 'cartridge', 'jam', 'printer', 'paper'],
    body: `Do not buy toner on a personal card. IT issues stock against the printer.

### What to send

1. The **asset code** on the printer sticker.
2. Floor / office (Pune, Hyderabad, Bhopal).
3. **Toner empty?** yes/no, and colour if it is a colour printer.
4. Jam: which door you already opened, and whether a sheet is still visible.

Raise a ticket (Hardware-other / printer) from [How to raise a ticket](/help/howto-raise-ticket). If IT have a printer template, use it — it asks for the printer asset.

> [!TIP]
> A jam that three people have already pulled at often needs a technician, not another tug. Stop and ticket it.

> [!WARNING]
> Do not shake a toner cartridge over the carpet. If it leaked, leave it and tell IT.`,
  },
  {
    id: 'howto-shared-drive',
    title: 'Shared-drive access',
    category: CAT,
    summary: 'Ask for a named share in a ticket. IT will not grant access from a chat ping.',
    keywords: ['shared drive', 'file share', 'smb', '\\\\files', 'permission', 'acl'],
    body: `Folder access is a **permission change**, so it goes on a ticket (Access & Account) with your manager in the loop.

### Raise it like this

1. [How to raise a ticket](/help/howto-raise-ticket) → category **Access & Account**.
2. Name the share exactly, e.g. \`\\\\files\\Finance\\AP\` or the mapped letter if you know it.
3. Read-only vs read-write.
4. Your manager’s name (IT will check).

You cannot “just get access” from a Teams message. If the drive is missing entirely, connect [VPN](/help/howto-vpn) first — off-network the share will not appear.

> [!NOTE]
> A 0-byte folder you can open but not edit is a permission issue, not a broken server. Still a ticket, still name the path.`,
  },
  {
    id: 'howto-phishing',
    title: 'Phishing — what to do',
    category: CAT,
    summary: 'Do not click. Do not forward to a friend. Tell IT with the original email.',
    keywords: ['phishing', 'scam', 'password', 'mfa', 'suspicious email'],
    body: `If an email, SMS, or Teams message asks you to **sign in**, **pay**, or **approve MFA** and something feels off — stop.

### Do this

1. **Do not click** the link. Do not enter your password on a page you reached from that message.
2. **Do not approve** an Authenticator prompt you did not start.
3. If you already typed a password, go to [Lost phone / MFA](/help/howto-mfa) and raise an **Account lockout** ticket immediately — say you may have given a password away.
4. Raise a ticket (or forward the mail to the helpdesk mailbox if your site uses email-in) **without** expanding attachments.
5. Tell your manager if money or a vendor payment was mentioned.

### What IT needs

- The sender address
- Time you received it
- Whether you clicked or typed anything

> [!WARNING]
> IT will never ask you to read out your password, Authenticator codes, or BitLocker key over the phone or chat.

> [!TIP]
> Unexpected MFA prompts on a quiet afternoon are often an attacker with your password. Deny, then ticket.`,
  },
  {
    id: 'howto-password',
    title: 'Password or account lockout',
    category: CAT,
    summary: 'How to ask IT for a reset without sending a password in chat.',
    keywords: ['password', 'lockout', 'reset', 'account', 'm365'],
    body: `Forgotten password, locked M365, or “Authenticator will not let me in” is the most common IT ticket. You cannot reset M365 yourself in NewVision.

### What you do

1. From any signed-in device (or a colleague’s, or the helpdesk walk-up), raise **Account lockout / password / MFA** — see [How to raise a ticket](/help/howto-raise-ticket).
2. Say which system: **NewVision**, **Microsoft 365 / Outlook**, **VPN**, or **biometric / door**.
3. Bring your employee ID or have your manager confirm. IT will not reset until they verify you.
4. Watch the ticket for “reset completed”. Then sign in and reply if it still fails.

Forgot **only** the NewVision website password? You can also use **Forgot password** on the sign-in page. That does not unlock Outlook.

> [!NOTE]
> Never send a new password in Teams or email. IT will not ask for one.`,
  },
];
