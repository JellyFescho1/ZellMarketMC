"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { ShoppingCart, User, Menu, ShieldCheck, Search, X, LogOut, Package, Sparkles, Ghost, Crown, Gamepad2, ChevronRight, TicketPercent, Copy, CheckCircle2 } from "lucide-react";

const ADMIN = "jellyharman6@gmail.com";
const money = n => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);
const categories = ["Semua", "Minecraft Premium", "Ranks", "Skins", "Capes", "Cosmetics", "Bundle"];
const demoProducts = [
  { id:"demo1", name:"Akun Minecraft Java & Bedrock", category:"Minecraft Premium", description:"Akun Minecraft original untuk Java dan Bedrock.", price:79999, old_price:100000, stock:24, image_url:"https://images.unsplash.com/photo-1607513746994-51f730a44832?w=900", active:true },
  { id:"demo2", name:"Rank Premium", category:"Ranks", description:"Rank premium dengan benefit eksklusif.", price:35000, old_price:50000, stock:15, image_url:"https://images.unsplash.com/photo-1614294149010-950b698f72c0?w=900", active:true },
  { id:"demo3", name:"Cape Custom", category:"Capes", description:"Cape keren untuk mempercantik karakter.", price:29000, old_price:35000, stock:30, image_url:"https://images.unsplash.com/photo-1627856013091-fed6e4e30025?w=900", active:true },
  { id:"demo4", name:"Bundle Special", category:"Bundle", description:"Paket spesial untuk petualangan Minecraft.", price:75000, old_price:100000, stock:8, image_url:"https://images.unsplash.com/photo-1587573089734-09cb69c0f2c9?w=900", active:true }
];
export default function Home() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [products,setProducts] = useState(demoProducts), [user,setUser] = useState(null), [profilePhone,setProfilePhone] = useState("");
  const [category,setCategory] = useState("Semua"), [search,setSearch] = useState(""), [modal,setModal] = useState("");
  const [authMode,setAuthMode] = useState("signin"), [email,setEmail] = useState(""), [password,setPassword] = useState(""), [fullName,setFullName] = useState(""), [phone,setPhone] = useState("");
  const [busy,setBusy] = useState(false), [notice,setNotice] = useState(""), [selected,setSelected] = useState(null);
  const [promo,setPromo] = useState(""), [qty,setQty] = useState(1), [payment,setPayment] = useState(null);
  const [orders,setOrders] = useState([]), [banner,setBanner] = useState(null), [adminTab,setAdminTab] = useState("dashboard");
  const [editProduct,setEditProduct] = useState(null), [productForm,setProductForm] = useState({name:"",category:"Minecraft Premium",description:"",price:"",old_price:"",stock:"",image_url:""});
  const [bannerUrl,setBannerUrl] = useState(""), [bannerFile,setBannerFile] = useState(null), [productFile,setProductFile] = useState(null), [promoForm,setPromoForm] = useState({code:"",discount_type:"percent",discount_value:"10",min_spend:"0"});
  const [loading,setLoading] = useState(true), [intro,setIntro] = useState(true), [introProgress,setIntroProgress] = useState(0);

  useEffect(() => {
    const started=Date.now();
    const progressTimer=setInterval(()=>setIntroProgress(Math.min(100,Math.round((Date.now()-started)/26))),26);
    const timer=setTimeout(()=>{setIntroProgress(100);setIntro(false)},2800);
    supabase.auth.getSession().then(({data})=>setUser(data.session?.user || null));
    const {data:listener}=supabase.auth.onAuthStateChange((_e,session)=>setUser(session?.user || null));
    loadStore();
    return ()=>{clearTimeout(timer);clearInterval(progressTimer);listener.subscription.unsubscribe();};
  },[]);
  async function loadStore(){
    const {data}=await supabase.from("products").select("*").eq("active",true).order("created_at",{ascending:false});
    if(data?.length) setProducts(data);
    const {data:b}=await supabase.from("settings").select("value").eq("key","hero_banner").maybeSingle();
    if(b?.value) setBanner(b.value);
    setLoading(false);
  }
  const isAdmin=user?.email?.toLowerCase()===ADMIN;
  const filtered=products.filter(p=>(category==="Semua"||p.category===category)&&(`${p.name} ${p.description||""}`).toLowerCase().includes(search.toLowerCase()));
  async function authSubmit(e){
    e.preventDefault();setBusy(true);setNotice("");
    try{
      if(authMode==="signup"){
        if(!phone.trim()) throw new Error("Nomor HP wajib diisi.");
        const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:location.origin, data:{full_name:fullName,phone}}});
        if(error) throw error;
        if(data.user) await supabase.from("profiles").upsert({id:data.user.id,email,full_name:fullName,phone});
        setNotice("Link verifikasi sudah dikirim ke email kamu. Verifikasi dulu sebelum login.");
      }else{
        const {error}=await supabase.auth.signInWithPassword({email,password});
        if(error) throw error;
        setModal("");setNotice("Berhasil login!");
      }
    }catch(e){setNotice(e.message)}finally{setBusy(false)}
  }
  async function logout(){await supabase.auth.signOut();setUser(null);setModal("");}
  async function getToken(){const {data}=await supabase.auth.getSession();return data.session?.access_token}
  async function buyNow(){
    if(!user){setAuthMode("signin");setModal("auth");return}
    if(!user.email_confirmed_at){setNotice("Verifikasi email terlebih dahulu.");return}
    setBusy(true);setNotice("");
    try{
      const token=await getToken();
      const res=await fetch("/api/payments/create",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({productId:selected.id,quantity:qty,promoCode:promo,phone:profilePhone||phone||user.user_metadata?.phone||""})});
      const data=await res.json();if(!res.ok)throw new Error(data.error||"Checkout gagal");
      setPayment(data);setModal("payment");
    }catch(e){setNotice(e.message)}finally{setBusy(false)}
  }
  async function showOrders(){
    if(!user){setModal("auth");return}
    setBusy(true);try{const token=await getToken();const r=await fetch("/api/orders/mine",{headers:{Authorization:`Bearer ${token}`}});const d=await r.json();if(!r.ok)throw new Error(d.error);setOrders(d.orders||[]);setModal("orders")}catch(e){setNotice(e.message)}finally{setBusy(false)}
  }
  async function adminLoadOrders(){
    const {data}=await supabase.from("orders").select("*").order("created_at",{ascending:false}).limit(100);setOrders(data||[]);
  }
  async function saveProduct(e){
    e.preventDefault();setBusy(true);
    let imageUrl = productForm.image_url;
    if (productFile) {
      const ext = productFile.name.split(".").pop().toLowerCase();
      const path = `products/${crypto.randomUUID()}.${ext}`;
      const upload = await supabase.storage.from("product-images").upload(path, productFile, { upsert: false, contentType: productFile.type });
      if (upload.error) { setBusy(false); setNotice("Upload gambar gagal: " + upload.error.message); return; }
      imageUrl = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    }
    const payload={...productForm,image_url:imageUrl,price:Number(productForm.price),old_price:Number(productForm.old_price||0),stock:Number(productForm.stock),active:true};
    const result=editProduct?await supabase.from("products").update(payload).eq("id",editProduct.id):await supabase.from("products").insert(payload);
    setBusy(false);if(result.error){setNotice(result.error.message);return}
    setNotice("Produk berhasil disimpan.");setEditProduct(null);setProductFile(null);setProductForm({name:"",category:"Minecraft Premium",description:"",price:"",old_price:"",stock:"",image_url:""});loadStore();
  }
  async function deleteProduct(id){if(!confirm("Hapus produk ini?"))return;const {error}=await supabase.from("products").delete().eq("id",id);setNotice(error?.message||"Produk dihapus.");loadStore()}
  async function saveBanner(){
    let url = bannerUrl;
    if (bannerFile) {
      const ext = bannerFile.name.split(".").pop().toLowerCase();
      const path = `banners/${crypto.randomUUID()}.${ext}`;
      const upload = await supabase.storage.from("product-images").upload(path, bannerFile, { upsert: false, contentType: bannerFile.type });
      if (upload.error) { setNotice("Upload banner gagal: " + upload.error.message); return; }
      url = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    }
    const {error}=await supabase.from("settings").upsert({key:"hero_banner",value:url});
    setNotice(error?.message||"Banner berhasil diperbarui.");setBanner(url);setBannerUrl(url);setBannerFile(null);
  }
  async function savePromo(e){e.preventDefault();const {error}=await supabase.from("promos").insert({...promoForm,discount_value:Number(promoForm.discount_value),min_spend:Number(promoForm.min_spend),active:true});setNotice(error?.message||"Promo dibuat.");}
  function openProductEditor(p=null){setEditProduct(p);setProductForm(p?{name:p.name,category:p.category,description:p.description||"",price:String(p.price),old_price:String(p.old_price||""),stock:String(p.stock),image_url:p.image_url||""}:{name:"",category:"Minecraft Premium",description:"",price:"",old_price:"",stock:"",image_url:""});setAdminTab("product-form")}
  async function openAdmin(){if(!isAdmin)return;await adminLoadOrders();setModal("admin")}
  const discount=p=>p.old_price>p.price?Math.round((1-p.price/p.old_price)*100):0;

  return <>
    {intro&&<div className="intro"><div className="intro-mark">ZM</div><div className="intro-wordmark"><span>Z</span><span>e</span><span>l</span><span>l</span><span>M</span><span>a</span><span>r</span><span>k</span><span>e</span><span>t</span><span>MC</span></div><div className="runner">🧑🏻‍💻</div><div className="load-track"><i style={{width:`${introProgress}%`}}/></div><div className="intro-percent">{introProgress}%</div><b>HARAP TUNGGU!!</b><small>MEMUAT DUNIA ZELLMARKETMC</small></div>}
    <div className="ambient"/><header className="nav wrap"><a className="brand" href="#"><span className="brand-logo">ZM</span><span>ZellMarket<span className="red">MC</span></span></a><nav><a className="active" href="#">Beranda</a><a href="#produk">Produk</a><button onClick={showOrders}>Cek Pesanan</button><a href="#bantuan">Bantuan</a>{isAdmin&&<button onClick={openAdmin}><ShieldCheck size={16}/> Admin</button>}</nav><div className="nav-right"><a className="discord" href={process.env.NEXT_PUBLIC_ADMIN_DISCORD||"#"} target="_blank">◈ Gabung Discord</a>{user?<button className="user-pill" onClick={()=>setModal("account")}><User size={16}/>{user.email.split("@")[0]}</button>:<><button className="ghost" onClick={()=>{setAuthMode("signin");setModal("auth")}}>Sign In</button><button className="signup" onClick={()=>{setAuthMode("signup");setModal("auth")}}>Sign Up</button></>}</div></header>
    <main>
      <section className="hero wrap" style={banner?{backgroundImage:`linear-gradient(90deg,rgba(8,8,13,.88),rgba(8,8,13,.22)),url("${banner}")`}:{}}>
        <div className="hero-content"><div className="eyebrow"><span/> GRAND OPENING • TOKO MINECRAFT INDONESIA <span className="flag">🇮🇩</span></div><h1>GRAND<br/><em>OPENING!</em></h1><p>Top Up Minecraft, Lebih Mudah & Murah!</p><div className="promo-chip"><TicketPercent/><div><small>KODE PROMO PEMBUKAAN</small><strong>ZELLNEW</strong><small>Diskon spesial untuk pembelian pertama!</small></div></div><a className="primary-btn" href="#produk">Mulai Belanja <ChevronRight size={18}/></a></div>
        <div className="hero-stats"><div><strong>24/7</strong><small>Online Shop</small></div><div><strong>100%</strong><small>Digital</small></div><div><strong>⚡</strong><small>Proses Cepat</small></div></div><div className="hero-ghost">👻</div><div className="hero-pumpkin">🎃</div>
      </section>
      <section className="trust wrap"><div><ShieldCheck/><span><b>Transaksi Aman</b><small>Pembayaran terverifikasi</small></span></div><div><Sparkles/><span><b>Produk Digital</b><small>Praktis dan cepat</small></span></div><div><Gamepad2/><span><b>Minecraft Store</b><small>Banyak pilihan item</small></span></div><div><Ghost/><span><b>Support Admin</b><small>Siap membantu kamu</small></span></div></section>
      <section className="products wrap" id="produk"><div className="section-heading"><div><div className="eyebrow">PILIHAN TERBAIK</div><h2>Jelajahi <span>Produk</span></h2><p>Temukan kebutuhan Minecraft favoritmu.</p></div><label className="search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari produk..."/></label></div>
        <div className="categories">{categories.map((c,i)=><button key={c} onClick={()=>setCategory(c)} className={category===c?"chosen":""}>{i===0?<Package size={17}/>:i===1?<Crown size={17}/>:<Sparkles size={17}/>} {c}</button>)}</div>
        <div className="product-grid">{filtered.map(p=><article className="product-card" key={p.id}><div className="product-image"><img src={p.image_url||"https://images.unsplash.com/photo-1607513746994-51f730a44832?w=900"} alt={p.name}/>{discount(p)>0&&<span className="discount">-{discount(p)}%</span>}<span className="category-tag">{p.category}</span></div><div className="product-info"><h3>{p.name}</h3><p>{p.description}</p><div className="product-meta"><span>⚡ PROSES CEPAT</span><small>Stok {p.stock}</small></div>{p.old_price>p.price&&<del>{money(p.old_price)}</del>}<strong className="price">{money(p.price)}</strong><button className="buy-btn" onClick={()=>{setSelected(p);setQty(1);setPromo("");setModal("checkout")}}><ShoppingCart size={17}/> Beli Sekarang</button></div></article>)}</div>
        {!filtered.length&&<div className="empty">Belum ada produk di kategori ini.</div>}
      </section>
      <section className="discord-banner wrap" id="bantuan"><div><span className="eyebrow">KOMUNITAS ZELLMARKETMC</span><h2>Gabung Discord<br/><em>Dan Dapatkan Promo!</em></h2><p>Ikuti update produk, event, dan promo terbaru dari kami.</p><a className="discord" href={process.env.NEXT_PUBLIC_ADMIN_DISCORD||"#"} target="_blank">◈ Gabung Discord</a></div><div className="banner-art">🎃<span>ZM</span>👻</div></section>
    </main>
    <footer><div className="brand"><span className="brand-logo">ZM</span><span>ZellMarket<span className="red">MC</span></span></div><p>© 2026 ZellMarketMC. Made for Minecraft players 🇮🇩</p><small>Produk digital • Pembayaran QRIS</small></footer>
    {notice&&<div className="toast" onClick={()=>setNotice("")}>{notice}<button><X size={14}/></button></div>}
    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal("")}}><div className="modal">
      <button className="modal-close" onClick={()=>setModal("")}><X/></button>
      {modal==="auth"&&<><div className="modal-logo">ZM</div><h2>{authMode==="signup"?"Buat Akun Baru":"Selamat Datang Kembali"}</h2><p className="muted">Akses pesanan dan belanja di ZellMarketMC.</p><div className="switch-auth"><button className={authMode==="signin"?"selected":""} onClick={()=>setAuthMode("signin")}>Sign In</button><button className={authMode==="signup"?"selected":""} onClick={()=>setAuthMode("signup")}>Sign Up</button></div><form onSubmit={authSubmit} className="form">{authMode==="signup"&&<><label>Nama lengkap<input required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Nama kamu"/></label><label>Nomor handphone<input required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="08xxxxxxxxxx"/></label></>}<label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@email.com"/></label><label>Password<input required minLength={6} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 6 karakter"/></label><button className="buy-btn" disabled={busy}>{busy?"Memproses...":authMode==="signup"?"Daftar & Kirim Verifikasi":"Login"}</button></form><small className="muted">Pendaftaran mengirim link verifikasi ke email kamu. Cek folder Spam juga.</small></>}
      {modal==="checkout"&&selected&&<><div className="eyebrow">CHECKOUT PRODUK</div><h2>Konfirmasi Pesanan</h2><div className="checkout-product"><img src={selected.image_url} alt=""/><div><b>{selected.name}</b><small>{money(selected.price)} / item</small></div></div><div className="form"><label>Jumlah<div className="qty"><button onClick={()=>setQty(Math.max(1,qty-1))}>−</button><b>{qty}</b><button onClick={()=>setQty(Math.min(10,qty+1))}>+</button></div></label><label>Kode promo<input value={promo} onChange={e=>setPromo(e.target.value)} placeholder="Masukkan kode promo"/></label><label>Nomor HP untuk dihubungi<input value={profilePhone||phone||user?.user_metadata?.phone||""} onChange={e=>setProfilePhone(e.target.value)} placeholder="08xxxxxxxxxx"/></label><div className="total-line"><span>Total sementara</span><b>{money(selected.price*qty)}</b></div><button className="buy-btn" disabled={busy} onClick={buyNow}>{busy?"Menyiapkan pembayaran...":"Lanjutkan Pembayaran"} <ChevronRight size={17}/></button></div><small className="muted">Kode unik KiPay dapat membuat nominal akhir sedikit berbeda.</small></>}
      {modal==="payment"&&payment&&<><div className="eyebrow">PEMBAYARAN QRIS</div><h2>Selesaikan Pembayaran</h2><p className="muted">Order {payment.orderCode}</p><div className="qr-wrap"><img src={payment.qrPath} alt="QRIS pembayaran"/><b>Scan QRIS melalui aplikasi pembayaran</b></div><div className="pay-total"><small>Total yang harus dibayar</small><strong>{money(payment.amount)}</strong></div><div className="copy-row"><span>ID: {payment.trxId}</span><button onClick={()=>navigator.clipboard.writeText(payment.trxId)}><Copy size={15}/></button></div><p className="muted center">QRIS berlaku sampai {payment.expiresAt||"batas waktu dari KiPay"}.</p><button className="buy-btn" onClick={()=>{setModal("");showOrders()}}>Saya Sudah Membayar — Cek Pesanan</button><div className="contact-row"><a href={`https://wa.me/${(process.env.NEXT_PUBLIC_ADMIN_WHATSAPP||"").replace(/\D/g,"")}`} target="_blank">Hubungi Admin WhatsApp</a><a href={process.env.NEXT_PUBLIC_ADMIN_DISCORD||"#"} target="_blank">Discord</a></div></>}
      {modal==="orders"&&<><div className="eyebrow">RIWAYAT PEMBELIAN</div><h2>Pesanan Kamu</h2><div className="order-list">{orders.map(o=><div className="order-row" key={o.order_code}><div><b>{o.product_name}</b><small>{o.order_code} • {new Date(o.created_at).toLocaleString("id-ID")}</small></div><div><b>{money(o.payable_amount)}</b><small className={o.payment_status==="paid"?"green":"orange"}>{o.payment_status}</small></div></div>)}{!orders.length&&<div className="empty">Belum ada pesanan.</div>}</div></>}
      {modal==="account"&&<><div className="modal-logo">ZM</div><h2>Akun Saya</h2><p>{user?.email}</p><p className="muted">{isAdmin?"Administrator":"Pelanggan"}</p><button className="buy-btn" onClick={showOrders}>Lihat Pesanan</button><button className="ghost wide" onClick={logout}>Logout</button></>}
      {modal==="admin"&&isAdmin&&<><div className="admin-head"><div className="modal-logo">ZM</div><div><h2>Admin Dashboard</h2><small>{ADMIN}</small></div></div><div className="admin-tabs">{["dashboard","products","product-form","banner","promos","orders"].map(t=><button className={adminTab===t?"selected":""} onClick={()=>{setAdminTab(t);if(t==="orders")adminLoadOrders()}}>{t==="product-form"?"Tambah/Edit":t==="products"?"Produk":t==="dashboard"?"Dashboard":t==="banner"?"Banner":t==="promos"?"Promo":"Pesanan"}</button>)}</div>
        {adminTab==="dashboard"&&<div className="admin-stats"><div><small>Total produk</small><b>{products.length}</b></div><div><small>Total pesanan</small><b>{orders.length}</b></div><div><small>Pesanan lunas</small><b>{orders.filter(o=>o.payment_status==="paid").length}</b></div><button className="buy-btn" onClick={()=>setAdminTab("product-form")}>+ Tambah Produk</button></div>}
        {adminTab==="products"&&<><button className="buy-btn" onClick={()=>openProductEditor()}>+ Tambah Produk</button><div className="admin-list">{products.map(p=><div className="order-row"><b>{p.name}</b><span>{money(p.price)}</span><button onClick={()=>openProductEditor(p)}>Edit</button><button className="danger" onClick={()=>deleteProduct(p.id)}>Hapus</button></div>)}</div></>}
        {adminTab==="product-form"&&<form className="form" onSubmit={saveProduct}><h3>{editProduct?"Edit Produk":"Tambah Produk"}</h3><label>Nama produk<input required value={productForm.name} onChange={e=>setProductForm({...productForm,name:e.target.value})}/></label><label>Kategori<select value={productForm.category} onChange={e=>setProductForm({...productForm,category:e.target.value})}>{categories.slice(1).map(c=><option>{c}</option>)}</select></label><label>Deskripsi<input value={productForm.description} onChange={e=>setProductForm({...productForm,description:e.target.value})}/></label><label>Harga<input required type="number" value={productForm.price} onChange={e=>setProductForm({...productForm,price:e.target.value})}/></label><label>Harga sebelum diskon<input type="number" value={productForm.old_price} onChange={e=>setProductForm({...productForm,old_price:e.target.value})}/></label><label>Stok<input required type="number" value={productForm.stock} onChange={e=>setProductForm({...productForm,stock:e.target.value})}/></label><label>Upload gambar produk<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setProductFile(e.target.files?.[0]||null)}/></label><label>Atau URL gambar<input value={productForm.image_url} onChange={e=>setProductForm({...productForm,image_url:e.target.value})} placeholder="https://..."/></label><button className="buy-btn" disabled={busy}>Simpan Produk</button></form>}
        {adminTab==="banner"&&<div className="form"><h3>Ganti Banner Grand Opening</h3><label>Upload gambar banner<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setBannerFile(e.target.files?.[0]||null)}/></label><label>Atau URL gambar<input value={bannerUrl} onChange={e=>setBannerUrl(e.target.value)} placeholder="https://..."/></label><button className="buy-btn" onClick={saveBanner}>Simpan Banner</button><small className="muted">File gambar disimpan di Supabase Storage bucket product-images.</small></div>}
        {adminTab==="promos"&&<form className="form" onSubmit={savePromo}><h3>Buat Kode Promo</h3><label>Kode promo<input required value={promoForm.code} onChange={e=>setPromoForm({...promoForm,code:e.target.value.toUpperCase()})}/></label><label>Tipe diskon<select value={promoForm.discount_type} onChange={e=>setPromoForm({...promoForm,discount_type:e.target.value})}><option value="percent">Persen (%)</option><option value="fixed">Potongan rupiah</option></select></label><label>Nilai diskon<input type="number" value={promoForm.discount_value} onChange={e=>setPromoForm({...promoForm,discount_value:e.target.value})}/></label><label>Minimal belanja<input type="number" value={promoForm.min_spend} onChange={e=>setPromoForm({...promoForm,min_spend:e.target.value})}/></label><button className="buy-btn">Buat Promo</button></form>}
        {adminTab==="orders"&&<div className="admin-list">{orders.map(o=><div className="order-row" key={o.id}><div><b>{o.product_name}</b><small>{o.order_code} • {o.customer_phone}</small><small>Pembeli: {o.user_id}</small></div><div><b>{money(o.payable_amount)}</b><small className={o.payment_status==="paid"?"green":"orange"}>{o.payment_status}</small><small>{o.order_status}</small></div></div>)}{!orders.length&&<div className="empty">Belum ada pesanan masuk.</div>}</div>}
      </>}
    </div></div>}
  </>;
}
