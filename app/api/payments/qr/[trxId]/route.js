import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET(_request, { params }) {
  const { trxId } = await params;
  if (!process.env.KIPAY_API_KEY) return NextResponse.json({ error: "KiPay belum dikonfigurasi." }, { status: 503 });
  const url = `https://api.kipay.id/api/pay/${process.env.KIPAY_API_KEY}/transactions/${encodeURIComponent(trxId)}/qr.png`;
  const upstream = await fetch(url, { cache: "no-store" });
  if (!upstream.ok) return NextResponse.json({ error: "QR belum tersedia." }, { status: 502 });
  return new NextResponse(await upstream.arrayBuffer(), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" }
  });
}
