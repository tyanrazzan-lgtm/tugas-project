import { useEffect, useState, type FormEvent } from "react";
import { api, getToken, setToken, clearToken, money } from "./api";

type Product = {
  id_produk: number;
  id_kategori: number;
  nama_produk: string;
  deskripsi?: string | null;
  harga: number | string;
  gambar?: string | null;
};

type Category = {
  id_kategori: number;
  nama_kategori: string;
};

const emptyForm = {
  nama_produk: "",
  id_kategori: "",
  deskripsi: "",
  harga: "",
  gambar: "",
};

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [admin, setAdmin] = useState(() => !!getToken());
  const [login, setLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

 
async function loadData() {
  setLoading(true);
  setError("");

  try {
    const [p, c] = await Promise.all([
      api<any>("/api/produk"),
      api<any>("/api/kategori"),
    ]);

    console.log("Respons API produk:", p);
    console.log("Respons API kategori:", c);

    const productData = Array.isArray(p)
      ? p
      : Array.isArray(p?.data)
        ? p.data
        : Array.isArray(p?.produk)
          ? p.produk
          : [];

    const categoryData = Array.isArray(c)
      ? c
      : Array.isArray(c?.data)
        ? c.data
        : Array.isArray(c?.kategori)
          ? c.kategori
          : [];

    setProducts(productData);
    setCategories(categoryData);
  } catch (err) {
    console.error("Gagal mengambil data:", err);

    setError(
      err instanceof Error
        ? err.message
        : "Gagal menghubungkan ke server."
    );
  } finally {
    setLoading(false);
  }
}


  useEffect(() => {
    void loadData();
  }, []);

  async function submitLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      const result = await api<any>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      const token = result?.token ?? result?.data?.token;

      if (!token) {
        throw new Error("Token login tidak ditemukan dari respons server.");
      }

      setToken(token);
      setAdmin(true);
      setLogin(false);
      setUsername("");
      setPassword("");
      alert("Login berhasil!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Login gagal.");
    }
  }

  async function saveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      const payload = {
        ...form,
        id_kategori: Number(form.id_kategori),
        harga: Number(form.harga),
        deskripsi: form.deskripsi || null,
        gambar: form.gambar || null,
      };

      await api(editing !== null ? `/api/produk/${editing}` : "/api/produk", {
        method: editing !== null ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      setForm({ ...emptyForm });
      setEditing(null);

      await loadData();
      alert("Produk berhasil disimpan.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan produk.");
    }
  }

  async function deleteProduct(id: number) {
    if (!confirm("Yakin ingin menghapus produk ini?")) return;

    try {
      await api(`/api/produk/${id}`, { method: "DELETE" });
      await loadData();
      alert("Produk berhasil dihapus.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus produk.");
    }
  }

  function startEdit(product: Product) {
      console.log("Produk yang diedit:", product);
  console.log("Daftar kategori:", categories);


    setEditing(product.id_produk);
    setForm({
      nama_produk: product.nama_produk,
      id_kategori: String(product.id_kategori),
      deskripsi: product.deskripsi || "",
      harga: String(product.harga),
      gambar: product.gambar || "",
    });

    document
      .getElementById("admin-panel")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  function logout() {
    clearToken();
    setAdmin(false);
    setEditing(null);
    setForm({ ...emptyForm });
  }

  const visible = products.filter((product) =>
    product.nama_produk.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="app">
      <div className="announcement">
        <span>WEAR YOUR OWN STORY</span>
        <p>Everyday essentials, thoughtfully selected.</p>
        <span>DISCOVER YOUR STYLE ↗</span>
      </div>

      <header className="site-header">
        <a href="#" className="brand">
          wearify<span>.</span>
        </a>

        <nav className="desktop-nav">
          <a href="#home">Home</a>
          <a href="#produk">Koleksi</a>
          <a href="#about">Tentang Kami</a>
        </nav>

        <div className="header-actions">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Cari produk"
            />
          </label>

          <button
            className="btn btn-dark admin-entry"
            onClick={() => setLogin(true)}
          >
            Admin ↗
          </button>
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-copy">
            <p className="eyebrow">01 / EVERYDAY FASHION</p>

            <h1>
              Wear your
              <br />
              own <span>story.</span>
            </h1>

            <p className="hero-desc">
              Temukan gaya favoritmu bersama Wearify. Pilihan fashion untuk
              menemani setiap cerita.
            </p>

            <a className="btn btn-dark hero-button" href="#produk">
              Lihat koleksi <span>↘</span>
            </a>

            <div className="hero-foot">
              <span>ESSENTIALS FOR EVERY DAY</span>
              <span>EST. 2026</span>
            </div>
          </div>

          <div className="hero-image">
            <img
              src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85"
              alt="Inspirasi gaya fashion sehari-hari"
            />
            <div className="image-caption">
              <span>THE EVERYDAY EDIT</span>
              <span>COLLECTION Nº 01</span>
            </div>
          </div>
        </section>

        <section className="value-strip">
          <div>
            <span>01</span>
            <b>Everyday essentials</b>
            <small>Gaya untuk setiap hari</small>
          </div>
          <div>
            <span>02</span>
            <b>Curated for you</b>
            <small>Pilihan yang lebih personal</small>
          </div>
          <div>
            <span>03</span>
            <b>Your own story</b>
            <small>Ekspresikan gaya sendiri</small>
          </div>
        </section>

        <section className="shop-section" id="produk">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE WEARIFY SELECTION</p>
              <h2>
                Temukan gayamu<span>.</span>
              </h2>
              <p className="section-desc">
                Koleksi pilihan untuk melengkapi keseharianmu.
              </p>
            </div>

            <div className="product-count">{visible.length} PRODUK</div>
          </div>

          <div className="filter-row">
            <span className="filter-chip active">Semua produk</span>
            <span className="filter-note">
              {search ? `Hasil pencarian: ${search}` : "MADE FOR EVERY DAY"}
            </span>
          </div>

          {error && (
            <div className="notice">
              <strong>Data belum dapat dimuat.</strong>
              <p>{error}</p>
              <button className="btn btn-dark" onClick={() => void loadData()}>
                Coba lagi
              </button>
            </div>
          )}

          {loading ? (
            <div className="empty-state">Memuat koleksi produk...</div>
          ) : visible.length === 0 ? (
            <div className="empty-state">
              {search
                ? "Produk yang kamu cari tidak ditemukan."
                : "Belum ada produk. Silakan tambahkan produk melalui admin."}
            </div>
          ) : (
            <div className="product-grid">
              {visible.map((product, index) => (
                <article className="product-card" key={product.id_produk}>
                  <div className="product-image">
                    <img
                      src={
                        product.gambar ||
                        "https://placehold.co/600x750/f0efe8/55554c?text=Wearify"
                      }
                      alt={product.nama_produk}
                      loading="lazy"
                    />

                    <span className="product-tag">
                      {String(index + 1).padStart(2, "0")} / WEARIFY
                    </span>
                  </div>

                  <div className="product-meta">
                    <div>
                      <p className="product-category">
                        {categories.find(
                          (category) =>
                            category.id_kategori === product.id_kategori,
                        )?.nama_kategori || "EVERYDAY COLLECTION"}
                      </p>

                      <h3>{product.nama_produk}</h3>

                      <p className="product-description">
                        {product.deskripsi || "Fashion untuk keseharian."}
                      </p>
                    </div>

                    <strong>{money(product.harga)}</strong>
                  </div>

                  {admin && (
                    <div className="actions">
                      <button
                        className="btn btn-outline"
                        onClick={() => startEdit(product)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => void deleteProduct(product.id_produk)}
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="story-section" id="about">
          <div className="story-image">
            <img
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1000&q=85"
              alt="Suasana butik fashion"
              loading="lazy"
            />
          </div>

          <div className="story-copy">
            <p className="eyebrow">A LITTLE ABOUT WEARIFY</p>
            <h2>Style that feels like you.</h2>
            <p>
              Kami percaya bahwa gaya bukan sekadar apa yang kamu pakai, tetapi
              juga cara kamu mengekspresikan diri. Temukan pilihan yang terasa
              nyaman dan mencerminkan ceritamu.
            </p>
            <a href="#produk" className="story-link">
              Explore the collection ↗
            </a>
            <div className="story-signature">
              wearify<span>.</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <a href="#home" className="brand">
          wearify<span>.</span>
        </a>
        <p>Everyday fashion. Your own story.</p>
        <div>
          <a href="#home">Home</a>
          <a href="#produk">Koleksi</a>
          <a href="#about">Tentang</a>
        </div>
        <small>© 2026 Wearify. Everyday fashion, thoughtfully selected.</small>
      </footer>

      {admin && (
        <section className="admin-panel" id="admin-panel">
          <div className="admin-heading">
            <div>
              <p className="eyebrow">MANAGE YOUR STORE</p>
              <h2>
                Dashboard Admin<span>.</span>
              </h2>
            </div>

            <button className="btn btn-outline" onClick={logout}>
              Logout
            </button>
          </div>

          <form className="product-form" onSubmit={saveProduct}>
            <h3>{editing !== null ? "Edit Produk" : "Tambah Produk Baru"}</h3>

            <label>
              Nama produk
              <input
                placeholder="Contoh: Basic Cotton Shirt"
                value={form.nama_produk}
                onChange={(e) =>
                  setForm({ ...form, nama_produk: e.target.value })
                }
                required
              />
            </label>

            <label>
              Kategori
              <select
                value={String(form.id_kategori ?? "")}
                onChange={(e) =>
                  setForm({
                    ...form,
                    id_kategori: e.target.value,
                  })
                }
                required
              >
                <option value="">Pilih kategori</option>

                {categories.map((category) => (
                  <option
                    key={category.id_kategori}
                    value={String(category.id_kategori)}
                  >
                    {category.nama_kategori}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Harga (Rupiah)
              <input
                type="number"
                min="0"
                placeholder="150000"
                value={form.harga}
                onChange={(e) => setForm({ ...form, harga: e.target.value })}
                required
              />
            </label>

            <label>
              URL gambar
              <input
                type="url"
                placeholder="https://contoh.com/gambar.jpg"
                value={form.gambar}
                onChange={(e) => setForm({ ...form, gambar: e.target.value })}
              />
            </label>

            <label>
              Deskripsi
              <textarea
                placeholder="Deskripsi produk..."
                rows={4}
                value={form.deskripsi}
                onChange={(e) =>
                  setForm({ ...form, deskripsi: e.target.value })
                }
              />
            </label>

            <div className="form-actions">
              <button className="btn btn-dark" type="submit">
                {editing !== null ? "Simpan Perubahan" : "Tambah Produk"}
              </button>

              {editing !== null && (
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setForm({ ...emptyForm });
                  }}
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      {login && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLogin(false);
          }}
        >
          <form className="login-card" onSubmit={submitLogin}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setLogin(false)}
              aria-label="Tutup"
            >
              ×
            </button>

            <p className="eyebrow">WEARIFY / ADMIN</p>
            <h2>
              Welcome back<span>.</span>
            </h2>
            <p className="login-desc">
              Masuk untuk mengelola koleksi produk Wearify.
            </p>

            <label>
              Username
              <input
                autoComplete="username"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <button className="btn btn-dark login-submit" type="submit">
              Masuk ke dashboard ↗
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
