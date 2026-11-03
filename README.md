# ZellMarketMC — Minecraft Web Shop

Website toko Minecraft Next.js + Supabase + KiPay QRIS.

## Fitur
- Tampilan merah-putih Indonesia + Halloween, logo bulat ZM, banner Grand Opening.
- Opening screen, animasi loading, Sign In / Sign Up, verifikasi email, dan nomor HP pelanggan.
- Produk, kategori, pencarian, kode promo, checkout QRIS KiPay.
- Cek pesanan pelanggan (hanya pesanan akun sendiri).
- Dashboard admin khusus `jellyharman6@gmail.com`: tambah/edit/hapus produk, upload gambar produk, ganti banner, buat promo, dan lihat semua pesanan.
- API key KiPay hanya dipakai di server; tidak dikirim ke browser.

---

## 1. Buat project Supabase
1. Buka https://supabase.com lalu buat project baru.
2. Masuk **SQL Editor** → **New query**.
3. Buka file `supabase/schema.sql`, copy seluruh isinya, paste ke SQL Editor, lalu klik **Run**.
4. Buka **Authentication → Providers → Email** dan aktifkan email confirmation.
5. Buka **Authentication → URL Configuration**. Isi Site URL dengan domain Vercel kamu. Tambahkan Redirect URLs: `https://DOMAIN-VERCEL-KAMU/**` dan `http://localhost:3000/**`.
6. Untuk email verifikasi otomatis yang stabil, atur SMTP di **Authentication → SMTP Settings**.
7. Dari **Project Settings → API**, salin Project URL, anon/public key, dan service_role key.

## 2. Isi file environment
1. Duplikat `.env.example`, ubah nama salinannya menjadi `.env.local`.
2. Isi variabel berikut dengan data project kamu:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY
KIPAY_API_KEY=API_KEY_KIPAY
KIPAY_WEBHOOK_SECRET=WEBHOOK_SECRET_KIPAY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_WHATSAPP=628xxxxxxxxxx
NEXT_PUBLIC_ADMIN_DISCORD=https://discord.gg/INVITE_KAMU
ADMIN_EMAIL=jellyharman6@gmail.com
```

**Jangan pernah** mengunggah `.env.local` ke GitHub. Jangan beri awalan `NEXT_PUBLIC_` pada API key KiPay atau Supabase service role key.

## 3. Jalankan di komputer
Buka terminal di folder yang berisi `package.json` dan folder `app`, lalu jalankan:

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

## 4. Hubungkan GitHub dan Vercel
1. Upload/push isi folder project ini ke repository GitHub. Pastikan `package.json`, `app`, `lib`, dan `supabase` berada pada folder project yang sama.
2. Vercel → **Add New → Project** → Import repository GitHub.
3. **Root Directory harus menunjuk ke folder yang langsung berisi `package.json` dan `app`.** Jika struktur GitHub seperti `ZellMarketMC/package.json` dan `ZellMarketMC/app`, pilih `ZellMarketMC`. Jika `package.json` dan `app` sudah berada di root repository, pilih `./`. Jangan pilih folder `app`.
4. Tambahkan semua environment variables di atas di **Settings → Environment Variables**. Untuk production, ganti `NEXT_PUBLIC_SITE_URL` dengan URL Vercel final, misalnya `https://zellmarketmc.vercel.app`.
5. Klik Deploy. Setelah mengubah environment variables, lakukan redeploy.

## 5. Aktifkan admin
1. Buka website.
2. Pilih **Sign Up** dan daftar menggunakan email `jellyharman6@gmail.com`.
3. Buka email tersebut dan klik link verifikasi dari Supabase.
4. Login menggunakan akun itu. Tombol **Admin** akan muncul otomatis.
5. Akun dengan email lain tidak mendapat akses admin. Hak akses juga dibatasi oleh Row Level Security di Supabase, bukan hanya disembunyikan dari tampilan.

## 6. Sambungkan KiPay QRIS
1. Di KiPay, buat project dan ambil API key serta webhook secret dari project tersebut.
2. Masukkan ke `KIPAY_API_KEY` dan `KIPAY_WEBHOOK_SECRET` pada `.env.local` dan Vercel Environment Variables.
3. Atur webhook URL di dashboard KiPay menjadi: `https://DOMAIN-VERCEL-KAMU/api/payments/webhook`.
4. Uji dahulu menggunakan API key sandbox. Setelah alur create QR → scan/test → webhook paid berhasil, baru ganti ke project production.

Integrasi memakai endpoint transaksi KiPay: `POST /api/pay/{apiKey}/transactions`, endpoint QR PNG, endpoint baca status transaksi, serta signature webhook HMAC-SHA256. Backend memeriksa ulang status transaksi ke KiPay sebelum menandai pesanan lunas.

## 7. Mengubah kontak admin
- Link Discord: ubah `NEXT_PUBLIC_ADMIN_DISCORD` di Vercel.
- Nomor WhatsApp admin: isi `NEXT_PUBLIC_ADMIN_WHATSAPP` dengan format internasional tanpa `+`, contoh `6281234567890`.
- Setelah mengubah nilai di Vercel, lakukan **Redeploy**.

## Catatan penting
- Nomor WhatsApp admin belum diisi karena kamu belum memberikan nomornya.
- Email verifikasi dikirim oleh Supabase Auth; nama pengirim dan template email dapat diatur di Supabase Auth Email Templates/SMTP.
- Produk digital belum dikirim otomatis setelah pembayaran. Admin perlu memproses order dan menghubungi pembeli lewat WhatsApp/Discord.
- Jangan gunakan pembayaran production sebelum tes sandbox selesai.
- Untuk keamanan, simpan API key, service role key, dan webhook secret hanya di Environment Variables server.
