import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(request) {
  const rawBody = await request.text();
  const timestamp = request.headers.get("x-webhook-timestamp") || "";
  const deliveryId = request.headers.get("x-webhook-delivery") || "";
  const signature = request.headers.get("x-webhook-signature") || "";
  if (!process.env.KIPAY_WEBHOOK_SECRET || !timestamp || !deliveryId || !signature) {
    return NextResponse.json({ error: "Missing signature headers." }, { status: 401 });
  }
  const age = Math.abs(Date.now() - new Date(timestamp).getTime());
  if (!Number.isFinite(age) || age > 5 * 60 * 1000) return NextResponse.json({ error: "Stale webhook." }, { status: 401 });
  const expected = "sha256=" + crypto.createHmac("sha256", process.env.KIPAY_WEBHOOK_SECRET)
    .update(`${timestamp}.${deliveryId}.${rawBody}`).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });

  const event = JSON.parse(rawBody);
  if (!["transaction.paid", "transaction.expired", "webhook.test"].includes(event.event)) {
    return NextResponse.json({ received: true });
  }
  if (event.event === "webhook.test") return NextResponse.json({ received: true });
  const trxId = event.transaction?.trx_id;
  if (!trxId) return NextResponse.json({ error: "Missing trx_id." }, { status: 400 });

  // Re-fetch transaction from KiPay; never fulfill an order from webhook payload alone.
  const verifyResponse = await fetch(`https://api.kipay.id/api/pay/${process.env.KIPAY_API_KEY}/transactions/${encodeURIComponent(trxId)}`, {
    headers: { Accept: "application/json" }, cache: "no-store"
  });
  if (!verifyResponse.ok) return NextResponse.json({ error: "Could not verify transaction." }, { status: 502 });
  const verified = await verifyResponse.json();
  const db = supabaseAdmin();
  const { data: order } = await db.from("orders").select("*").eq("kipay_trx_id", trxId).maybeSingle();
  if (!order) return NextResponse.json({ received: true });
  if (verified.status === "paid" && event.event === "transaction.paid") {
    if (order.payment_status !== "paid") {
      await db.from("orders").update({ payment_status: "paid", order_status: "processing", paid_at: new Date().toISOString() }).eq("id", order.id);
    }
  } else if (verified.status === "expired" || event.event === "transaction.expired") {
    await db.from("orders").update({ payment_status: "expired", order_status: "cancelled" }).eq("id", order.id);
  }
  return NextResponse.json({ received: true });
}
