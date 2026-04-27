import React, { createContext, useContext, useState } from "react";

export type Lang = "zh" | "en";

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: typeof zh;
}

const zh = {
  nav: {
    features: "功能特性",
    pricing: "订阅方案",
    faq: "常见问题",
    login: "登录",
    register: "免费注册",
  },
  hero: {
    badge: "专业量化跟单平台",
    title1: "让顶级策略",
    title2: "为你赚钱",
    desc: "AlphaRoute 接入全球顶级信号源，毫秒级同步下单，支持 OKX / Binance / Bybit 等主流交易所，订阅即用，无需编程。",
    cta: "立即免费试用 7 天",
    ctaSub: "无需信用卡 · 随时取消",
    stat1: "跟单成功率",
    stat2: "平均延迟",
    stat3: "支持交易所",
    stat4: "活跃用户",
  },
  ticker: {
    label: "实时跟单信号",
  },
  features: {
    title: "为什么选择 AlphaRoute",
    sub: "专为追求稳定收益的投资者设计，从信号到成交，全程自动化",
    items: [
      {
        icon: "Zap",
        title: "毫秒级执行",
        desc: "WebSocket 实时推送，信号触发到下单延迟 < 10ms，抢占最优价格。",
      },
      {
        icon: "Shield",
        title: "资金安全",
        desc: "仅需 API 交易权限，资金始终在您的交易所账户，平台无法触碰。",
      },
      {
        icon: "BarChart3",
        title: "多交易所同步",
        desc: "一个信号同时触发 OKX、Binance、Bybit、Gate、Bitget 多账户跟单。",
      },
      {
        icon: "Settings2",
        title: "灵活倍率设置",
        desc: "自定义跟单倍率，小资金也能按比例精准跟随大资金策略。",
      },
      {
        icon: "TrendingUp",
        title: "实时盈亏统计",
        desc: "清晰展示每笔跟单的开仓价、平仓价、手续费及净盈亏。",
      },
      {
        icon: "Gift",
        title: "邀请返利",
        desc: "邀请好友订阅，双方均可获得额外订阅天数奖励，永久有效。",
      },
    ],
  },
  howit: {
    title: "三步开始跟单",
    sub: "从注册到第一笔跟单，最快 5 分钟",
    steps: [
      { num: "01", title: "注册账户", desc: "使用邮箱快速注册，享受 7 天免费试用，无需绑卡。" },
      { num: "02", title: "绑定交易所 API", desc: "在交易所创建只读+交易权限的 API Key，粘贴到平台即完成绑定。" },
      { num: "03", title: "选择策略开始跟单", desc: "选择信号源策略，设置跟单倍率，系统自动同步每一笔信号。" },
    ],
  },
  pricing: {
    title: "透明定价，按需订阅",
    sub: "所有方案均包含 7 天免费试用，随时可取消",
    trial: "7 天免费试用",
    trialDesc: "所有新用户",
    basic: {
      name: "基础档",
      target: "适合小额账户",
      features: ["跟单基础信号源", "支持 3 个交易所", "实时盈亏统计", "邀请奖励"],
    },
    advanced: {
      name: "进阶档",
      target: "适合大额账户",
      badge: "推荐",
      features: ["跟单全部信号源", "支持全部交易所", "优先执行通道", "专属客服支持", "邀请奖励加倍"],
    },
    note: "订阅费用以 USDT 支付，支持 BSC BEP20 / TRC20 链上转账，自动到账激活。",
  },
  faq: {
    title: "常见问题",
    items: [
      {
        q: "平台会接触我的资金吗？",
        a: "不会。平台只使用您交易所 API 的交易权限进行下单，提现权限不需要开启，您的资金始终在您自己的交易所账户中。",
      },
      {
        q: "支持哪些交易所？",
        a: "目前支持 OKX、Binance、Bybit、Gate.io、Bitget，后续会持续扩展。",
      },
      {
        q: "跟单延迟有多低？",
        a: "信号通过 WebSocket 实时推送，从信号触发到下单完成平均延迟低于 10 毫秒。",
      },
      {
        q: "如何取消订阅？",
        a: "订阅到期后不会自动续费，您无需任何操作，到期即停止跟单。",
      },
      {
        q: "邀请奖励如何计算？",
        a: "您邀请的用户每次订阅，您将获得对应比例的订阅天数奖励。被邀请人续费时，您同样可以获得奖励。",
      },
    ],
  },
  cta: {
    title: "准备好开始了吗？",
    sub: "加入数千名投资者，让 AlphaRoute 帮你自动执行最优策略。",
    btn: "免费注册，立即体验",
    login: "已有账户？登录",
  },
  footer: {
    desc: "专业量化跟单平台，让顶级策略触手可及。",
    links: "快速链接",
    contact: "联系我们",
    rights: "© 2025 AlphaRoute. All rights reserved.",
  },
};

const en: typeof zh = {
  nav: {
    features: "Features",
    pricing: "Pricing",
    faq: "FAQ",
    login: "Log In",
    register: "Start Free",
  },
  hero: {
    badge: "Professional Copy Trading Platform",
    title1: "Let Top Strategies",
    title2: "Work For You",
    desc: "AlphaRoute connects to world-class signal sources with millisecond-level order sync. Supports OKX, Binance, Bybit and more — subscribe and trade, no coding required.",
    cta: "Start 7-Day Free Trial",
    ctaSub: "No credit card · Cancel anytime",
    stat1: "Copy Success Rate",
    stat2: "Avg. Latency",
    stat3: "Exchanges",
    stat4: "Active Users",
  },
  ticker: {
    label: "Live Copy Signals",
  },
  features: {
    title: "Why Choose AlphaRoute",
    sub: "Built for investors who demand consistent returns — fully automated from signal to execution",
    items: [
      {
        icon: "Zap",
        title: "Millisecond Execution",
        desc: "WebSocket real-time push. Signal-to-order latency under 10ms — always at the best price.",
      },
      {
        icon: "Shield",
        title: "Your Funds Stay Safe",
        desc: "Only trading API permission required. Your funds stay in your exchange account — we never touch them.",
      },
      {
        icon: "BarChart3",
        title: "Multi-Exchange Sync",
        desc: "One signal triggers simultaneous orders across OKX, Binance, Bybit, Gate, and Bitget.",
      },
      {
        icon: "Settings2",
        title: "Flexible Multipliers",
        desc: "Set custom copy ratios to follow large-capital strategies proportionally with any account size.",
      },
      {
        icon: "TrendingUp",
        title: "Real-Time P&L Tracking",
        desc: "Clear display of entry price, exit price, fees, and net P&L for every copied trade.",
      },
      {
        icon: "Gift",
        title: "Referral Rewards",
        desc: "Invite friends to subscribe — both parties earn bonus subscription days, permanently.",
      },
    ],
  },
  howit: {
    title: "3 Steps to Start",
    sub: "From sign-up to your first copied trade in under 5 minutes",
    steps: [
      { num: "01", title: "Create Account", desc: "Sign up with email and enjoy a 7-day free trial. No card needed." },
      { num: "02", title: "Connect Exchange API", desc: "Create a read+trade API key on your exchange and paste it into AlphaRoute." },
      { num: "03", title: "Choose Strategy & Go", desc: "Select a signal source, set your copy ratio, and let the system handle the rest." },
    ],
  },
  pricing: {
    title: "Simple, Transparent Pricing",
    sub: "All plans include a 7-day free trial. Cancel anytime.",
    trial: "7-Day Free Trial",
    trialDesc: "For all new users",
    basic: {
      name: "Basic",
      target: "For smaller accounts",
      features: ["Basic signal sources", "Up to 3 exchanges", "Real-time P&L stats", "Referral rewards"],
    },
    advanced: {
      name: "Advanced",
      target: "For larger accounts",
      badge: "Recommended",
      features: ["All signal sources", "All exchanges", "Priority execution", "Dedicated support", "2x referral rewards"],
    },
    note: "Subscription fees are paid in USDT via BSC BEP20 or TRC20. Auto-activated upon on-chain confirmation.",
  },
  faq: {
    title: "Frequently Asked Questions",
    items: [
      {
        q: "Does AlphaRoute have access to my funds?",
        a: "No. We only use the trading permission of your exchange API. Withdrawal permission is not required — your funds always stay in your own exchange account.",
      },
      {
        q: "Which exchanges are supported?",
        a: "Currently OKX, Binance, Bybit, Gate.io, and Bitget. More exchanges will be added continuously.",
      },
      {
        q: "How low is the copy latency?",
        a: "Signals are pushed via WebSocket in real time. Average latency from signal trigger to order completion is under 10 milliseconds.",
      },
      {
        q: "How do I cancel my subscription?",
        a: "Subscriptions do not auto-renew. Simply let it expire and copy trading will stop automatically.",
      },
      {
        q: "How are referral rewards calculated?",
        a: "Each time your referred user subscribes, you receive a proportional bonus in subscription days. Renewals also count.",
      },
    ],
  },
  cta: {
    title: "Ready to Get Started?",
    sub: "Join thousands of investors and let AlphaRoute execute the best strategies for you automatically.",
    btn: "Sign Up Free — Start Today",
    login: "Already have an account? Log in",
  },
  footer: {
    desc: "Professional copy trading platform — bringing top strategies within reach.",
    links: "Quick Links",
    contact: "Contact",
    rights: "© 2025 AlphaRoute. All rights reserved.",
  },
};

export const translations = { zh, en };

const LangContext = createContext<LangContextType>({
  lang: "zh",
  setLang: () => {},
  t: zh,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem("alpharoute-lang");
    return (stored as Lang) || "zh";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("alpharoute-lang", l);
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
