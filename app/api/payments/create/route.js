import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || !user.email_confirmed_at) {
      return NextResponse.json({ error: "Silakan login dan verifikasi email terlebih dahulu." }, { status: 401 });
    }
    const { productId, quantity = 1, promoCode = "", phone = "" } = await request.json();
    const qty = Math.max(1, Math.min(10, Number(quantity) || 1));
    if (!/^[+0-9][0-9+\-\s]{7,19}$/.test(phone)) {
      return NextResponse.json({ error: "Nomor HP tidak valid." }, { status: 400 });
    }
    const db = supabaseAdmin();
    const { data: product, error: productError } = await db.from("products").select("*").eq("id", productId).eq("active", true).single();
    if (productError || !product || product.stock < qty) {
      return NextResponse.json({ error: "Produk tidak tersedia atau stok tidak cukup." }, { status: 400 });
    }
    let subtotal = Number(product.price) * qty;
    let discount = 0;
    if (promoCode?.trim()) {
      const { data: promo } = await db.from("promos").select("*").ilike("code", promoCode.trim()).eq("active", true).maybeSingle();
      if (!promo || (promo.expires_at && new Date(promo.expires_at) < new Date()) ||
          (promo.max_uses !== null && promo.used_count >= promo.max_uses) ||
          (promo.min_spend && subtotal < promo.min_spend)) {
        return NextResponse.json({ error: "Kode promo tidak valid atau sudah kedaluwarsa." }, { status: 400 });
      }
      discount = promo.discount_type === "percent"
        ? Math.floor(subtotal * Math.min(100, promo.discount_value) / 100)
        : Math.min(subtotal, promo.discount_value);
    }
    const requestedAmount = Math.max(1000, subtotal - discount);
    const orderCode = "ZM-" + Date.now().toString(36).toUpperCase();
    const { data: order, error: orderError } = await db.from("orders").insert({
      user_id: user.id, order_code: orderCode, product_id: product.id,
      product_name: product.name, quantity: qty, subtotal, discount,
      requested_amount: requestedAmount, payable_amount: requestedAmount,
      customer_phone: phone, payment_status: "creating", order_status: "waiting_payment"
    }).select().single();
    if (orderError) throw orderError;

    if (!process.env.KIPAY_API_KEY) throw new Error("KIPAY_API_KEY belum diatur di Vercel.");
    const response = await fetch(`https://api.kipay.id/api/pay/${process.env.KIPAY_API_KEY}/transactions`, {
      method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ amount: requestedAmount, note: orderCode }), cache: "no-store"
    });
    const trx = await response.json();
    if (!response.ok || !trx.trx_id || !trx.qr_url) {
      await db.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
      return NextResponse.json({ error: trx.error || "KiPay gagal membuat transaksi." }, { status: 502 });
    }
    await db.from("orders").update({
      kipay_trx_id: trx.trx_id, payable_amount: trx.amount,
      payment_status: trx.status || "pending", payment_expires_at: trx.expires_at
    }).eq("id", order.id);
    if (promoCode?.trim()) {
      const { data: usedPromo } = await db.from("promos").select("id,used_count").ilike("code", promoCode.trim()).maybeSingle();
      if (usedPromo) await db.from("promos").update({ used_count: (usedPromo.used_count || 0) + 1 }).eq("id", usedPromo.id);
    }
    return NextResponse.json({
      orderCode, trxId: trx.trx_id, amount: trx.amount, requestedAmount,
      uniqueCode: trx.unique_code || 0, expiresAt: trx.expires_at,
      qrPath: `/api/payments/qr/${encodeURIComponent(trx.trx_id)}`
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Terjadi kesalahan server." }, { status: 500 });
  }
}
