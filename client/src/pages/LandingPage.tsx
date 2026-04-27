import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import {
  Zap, Shield, BarChart3, Settings2, TrendingUp, Gift,
  ChevronDown, ArrowRight, LineChart, Globe, Menu, X,
  CheckCircle2, Star, Users, Clock, Activity
} from "lucide-react";
import { LangProvider, useLang, type Lang } from "@/contexts/LangContext";

// ── Icon map ──────────────────────────────────────────────────────────────────
const ICONS: Record<string, React.ElementType> = {
  Zap, Shield, BarChart3, Settings2, TrendingUp, Gift,
};

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = Math.ceil(to / 60);
    const timer = setInterval(() => {
      start = Math.min(start + step, to);
      setVal(start);
      if (start >= to) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

// ── Ticker bar ────────────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  { symbol: "BTC-USDT-SWAP", action: "open_long",  pnl: "+2.34%", exchange: "OKX" },
  { symbol: "ETH-USDT-SWAP", action: "open_short", pnl: "+1.87%", exchange: "Binance" },
  { symbol: "SOL-USDT-SWAP", action: "close_long", pnl: "+4.12%", exchange: "Bybit" },
  { symbol: "BNB-USDT-SWAP", action: "open_long",  pnl: "+0.93%", exchange: "Gate" },
  { symbol: "ARB-USDT-SWAP", action: "open_short", pnl: "+3.21%", exchange: "Bitget" },
  { symbol: "OP-USDT-SWAP",  action: "close_short",pnl: "+1.55%", exchange: "OKX" },
];
function TickerBar({ label }: { label: string }) {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="w-full bg-black/40 border-y border-white/5 py-2.5 overflow-hidden">
      <div className="flex items-center gap-4 px-4 mb-1">
        <span className="flex items-center gap-1.5 text-xs text-primary font-semibold shrink-0">
          <Activity className="w-3 h-3 animate-pulse" />
          {label}
        </span>
      </div>
      <div className="flex gap-8 animate-ticker whitespace-nowrap">
        {items.map((item, i) => {
          const isLong = item.action.includes("long");
          return (
            <span key={i} className="inline-flex items-center gap-2 text-xs shrink-0">
              <span className="font-mono text-white/80">{item.symbol}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${isLong ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                {item.action === "open_long" ? "开多" : item.action === "open_short" ? "开空" : item.action === "close_long" ? "平多" : "平空"}
              </span>
              <span className="text-green-400 font-semibold">{item.pnl}</span>
              <span className="text-white/40">{item.exchange}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── FAQ Item ──────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-white/90">{q}</span>
        <ChevronDown className={`w-4 h-4 text-white/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-6 pb-4 text-sm text-white/60 leading-relaxed border-t border-white/5 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

// ── Language Switch ───────────────────────────────────────────────────────────
function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center gap-1 bg-white/10 rounded-lg p-0.5">
      {(["zh", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
            lang === l
              ? "bg-primary text-white shadow"
              : "text-white/60 hover:text-white"
          }`}
        >
          {l === "zh" ? "中文" : "EN"}
        </button>
      ))}
    </div>
  );
}

// ── Main Landing Page ─────────────────────────────────────────────────────────
function LandingInner() {
  const { t, lang } = useLang();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fadeUp = {
    hidden: { opacity: 0, y: 32 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const stagger = {
    visible: { transition: { staggerChildren: 0.1 } },
  };

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white overflow-x-hidden">

      {/* ── Navbar ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#0a0b0f]/95 backdrop-blur-md border-b border-white/5 shadow-lg" : ""}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/landing" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-violet-500 rounded-lg flex items-center justify-center shadow-lg shadow-primary/30">
              <LineChart className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">AlphaRoute</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {[
              { href: "#features", label: t.nav.features },
              { href: "#pricing", label: t.nav.pricing },
              { href: "#faq", label: t.nav.faq },
            ].map((item) => (
              <a key={item.href} href={item.href} className="text-sm text-white/60 hover:text-white transition-colors">
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right actions */}
          <div className="hidden md:flex items-center gap-3">
            <LangSwitch />
            <Link href="/login">
              <button className="text-sm text-white/70 hover:text-white transition-colors px-3 py-1.5">
                {t.nav.login}
              </button>
            </Link>
            <Link href="/register">
              <button className="text-sm bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg shadow-primary/25 hover:shadow-primary/40">
                {t.nav.register}
              </button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <LangSwitch />
            <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white/70 p-1">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-[#0d0e14] border-t border-white/5 px-4 py-4 space-y-3">
            {[
              { href: "#features", label: t.nav.features },
              { href: "#pricing", label: t.nav.pricing },
              { href: "#faq", label: t.nav.faq },
            ].map((item) => (
              <a key={item.href} href={item.href} className="block text-sm text-white/70 py-2" onClick={() => setMobileOpen(false)}>
                {item.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2">
              <Link href="/login" className="flex-1">
                <button className="w-full text-sm border border-white/20 text-white/80 py-2 rounded-lg">{t.nav.login}</button>
              </Link>
              <Link href="/register" className="flex-1">
                <button className="w-full text-sm bg-primary text-white py-2 rounded-lg font-medium">{t.nav.register}</button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute top-20 left-1/4 w-[300px] h-[300px] bg-violet-500/8 rounded-full blur-[80px]" />
          <div className="absolute top-40 right-1/4 w-[250px] h-[250px] bg-blue-500/8 rounded-full blur-[80px]" />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-sm font-medium mb-6">
                <Zap className="w-3.5 h-3.5" />
                {t.hero.badge}
              </span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-tight tracking-tight mb-6">
              <span className="text-white">{t.hero.title1}</span>
              <br />
              <span className="bg-gradient-to-r from-primary via-violet-400 to-blue-400 bg-clip-text text-transparent">
                {t.hero.title2}
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed mb-10">
              {t.hero.desc}
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link href="/register">
                <button className="group flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-all duration-200 shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-105">
                  {t.hero.cta}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <p className="text-sm text-white/40">{t.hero.ctaSub}</p>
            </motion.div>

            {/* Stats */}
            <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {[
                { value: 98, suffix: "%", label: t.hero.stat1 },
                { value: 10, suffix: "ms", label: t.hero.stat2 },
                { value: 5, suffix: "+", label: t.hero.stat3 },
                { value: 3000, suffix: "+", label: t.hero.stat4 },
              ].map((s, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
                  <div className="text-3xl font-bold text-white mb-1">
                    <Counter to={s.value} suffix={s.suffix} />
                  </div>
                  <div className="text-xs text-white/50">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Ticker ── */}
      <TickerBar label={t.ticker.label} />

      {/* ── Features ── */}
      <section id="features" className="py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {t.features.title}
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/50 max-w-xl mx-auto">
              {t.features.sub}
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {t.features.items.map((item, i) => {
              const Icon = ICONS[item.icon] || Zap;
              return (
                <motion.div
                  key={i} variants={fadeUp}
                  className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-primary/30 rounded-2xl p-6 transition-all duration-300"
                >
                  <div className="w-11 h-11 bg-primary/15 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/25 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-24 px-4 sm:px-6 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-white mb-4">{t.howit.title}</motion.h2>
            <motion.p variants={fadeUp} className="text-white/50">{t.howit.sub}</motion.p>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {t.howit.steps.map((step, i) => (
              <motion.div key={i} variants={fadeUp} className="relative text-center">
                {i < t.howit.steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] right-[-calc(50%-40px)] h-px bg-gradient-to-r from-primary/40 to-transparent" />
                )}
                <div className="w-16 h-16 bg-gradient-to-br from-primary/30 to-violet-500/20 border border-primary/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <span className="text-xl font-bold text-primary">{step.num}</span>
                </div>
                <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-white mb-4">{t.pricing.title}</motion.h2>
            <motion.p variants={fadeUp} className="text-white/50">{t.pricing.sub}</motion.p>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          >
            {/* Free trial */}
            <motion.div variants={fadeUp} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-green-500/15 rounded-xl flex items-center justify-center mb-4">
                <Star className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{t.pricing.trial}</h3>
              <p className="text-sm text-white/50 mb-4">{t.pricing.trialDesc}</p>
              <div className="text-4xl font-extrabold text-green-400 mb-6">$0</div>
              <Link href="/register" className="w-full">
                <button className="w-full py-2.5 rounded-xl border border-green-500/40 text-green-400 text-sm font-medium hover:bg-green-500/10 transition-colors">
                  {lang === "zh" ? "立即开始" : "Get Started"}
                </button>
              </Link>
            </motion.div>

            {/* Basic */}
            <motion.div variants={fadeUp} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 flex flex-col">
              <h3 className="text-lg font-bold text-white mb-1">{t.pricing.basic.name}</h3>
              <p className="text-sm text-white/50 mb-4">{t.pricing.basic.target}</p>
              <div className="text-4xl font-extrabold text-white mb-1">
                {lang === "zh" ? "后台配置" : "Configurable"}
              </div>
              <p className="text-xs text-white/30 mb-6">USDT / {lang === "zh" ? "月" : "month"}</p>
              <ul className="space-y-2.5 mb-6 flex-1">
                {t.pricing.basic.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-white/70">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <button className="w-full py-2.5 rounded-xl border border-white/20 text-white/80 text-sm font-medium hover:bg-white/5 transition-colors">
                  {lang === "zh" ? "选择基础档" : "Choose Basic"}
                </button>
              </Link>
            </motion.div>

            {/* Advanced */}
            <motion.div variants={fadeUp} className="relative bg-gradient-to-b from-primary/20 to-violet-500/10 border border-primary/40 rounded-2xl p-6 flex flex-col shadow-xl shadow-primary/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                  {t.pricing.advanced.badge}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{t.pricing.advanced.name}</h3>
              <p className="text-sm text-white/50 mb-4">{t.pricing.advanced.target}</p>
              <div className="text-4xl font-extrabold text-white mb-1">
                {lang === "zh" ? "后台配置" : "Configurable"}
              </div>
              <p className="text-xs text-white/30 mb-6">USDT / {lang === "zh" ? "月" : "month"}</p>
              <ul className="space-y-2.5 mb-6 flex-1">
                {t.pricing.advanced.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-white/80">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <button className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-primary/30">
                  {lang === "zh" ? "选择进阶档" : "Choose Advanced"}
                </button>
              </Link>
            </motion.div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-center text-xs text-white/30 max-w-xl mx-auto"
          >
            {t.pricing.note}
          </motion.p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-12">
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-white mb-4">{t.faq.title}</motion.h2>
          </motion.div>
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="space-y-3"
          >
            {t.faq.items.map((item, i) => (
              <motion.div key={i} variants={fadeUp}>
                <FaqItem q={item.q} a={item.a} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-4 sm:px-6">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="relative bg-gradient-to-br from-primary/20 via-violet-500/10 to-blue-500/10 border border-primary/20 rounded-3xl p-12 overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
            <div className="relative">
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-white mb-4">{t.cta.title}</motion.h2>
              <motion.p variants={fadeUp} className="text-white/60 mb-8 text-lg">{t.cta.sub}</motion.p>
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register">
                  <button className="group flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-8 py-3.5 rounded-xl font-semibold transition-all duration-200 shadow-xl shadow-primary/30 hover:scale-105">
                    {t.cta.btn}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <Link href="/login">
                  <button className="text-sm text-white/50 hover:text-white/80 transition-colors">
                    {t.cta.login}
                  </button>
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-gradient-to-br from-primary to-violet-500 rounded-lg flex items-center justify-center">
                  <LineChart className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white">AlphaRoute</span>
              </div>
              <p className="text-sm text-white/40 leading-relaxed">{t.footer.desc}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white/70 mb-3">{t.footer.links}</h4>
              <div className="space-y-2">
                {[
                  { href: "#features", label: t.nav.features },
                  { href: "#pricing", label: t.nav.pricing },
                  { href: "/login", label: t.nav.login },
                  { href: "/register", label: t.nav.register },
                ].map((l) => (
                  <a key={l.href} href={l.href} className="block text-sm text-white/40 hover:text-white/70 transition-colors">
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white/70 mb-3">{t.footer.contact}</h4>
              <div className="flex items-center gap-2 text-sm text-white/40">
                <Globe className="w-4 h-4" />
                <span>support@alpharoute.io</span>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 text-center text-xs text-white/25">
            {t.footer.rights}
          </div>
        </div>
      </footer>

    </div>
  );
}

export default function LandingPage() {
  return (
    <LangProvider>
      <LandingInner />
    </LangProvider>
  );
}
