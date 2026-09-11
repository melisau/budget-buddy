"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bot,
  ChartNoAxesCombined,
  Check,
  FileSpreadsheet,
  Landmark,
  Menu,
  PiggyBank,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { LanguageSelect, useT } from "@/components/providers/language-provider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import type { Navigate } from "@/components/budgetbuddy/view-types";

const flow = [
  { m: "Apr", income: 43, expense: 29 },
  { m: "May", income: 46, expense: 31 },
  { m: "Jun", income: 45, expense: 30 },
  { m: "Jul", income: 49, expense: 32 },
  { m: "Aug", income: 51, expense: 34 },
  { m: "Sep", income: 55, expense: 30.7 },
];

const compactSection: CSSProperties = {
  paddingInline: "20px",
  width: "100%",
  maxWidth: "100%",
};
const compactGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  width: "100%",
};
const compactCard: CSSProperties = {
  gridColumn: "auto",
  gridRow: "auto",
  width: "100%",
  minWidth: 0,
};

const featureCards = [
  [FileSpreadsheet, "Review-first CSV import", "Add manually or approve imported rows."],
  [Landmark, "All accounts, one view", "Cash, checking, savings, cards and wallets."],
  [Target, "Goals that feel reachable", "Turn big plans into visible milestones."],
] as const satisfies ReadonlyArray<readonly [LucideIcon, string, string]>;

const howSteps = [
  ["01", "Add your money", "Enter transactions manually or import a CSV."],
  ["02", "Set your plan", "Create budgets and savings goals that fit your life."],
  ["03", "See what matters", "Use your dashboard and focused AI insights."],
] as const;

const faqs = [
  ["Do I need a CSV?", "No. Manual transaction entry is always available."],
  ["Does BudgetBuddy move money?", "No. This demo organizes information and cannot move funds."],
  ["Is AI financial advice?", "No. It summarizes your tracked data and budgeting patterns."],
  ["Does it work on mobile?", "Yes. Every view adapts to mobile screens."],
] as const;

export function LandingScreen({ go }: { go: Navigate }) {
  const [menu, setMenu] = useState(false);
  const [compact, setCompact] = useState(false);
  const t = useT();

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const closeMenu = () => setMenu(false);

  return (
    <div className="landing" data-compact={compact ? "true" : undefined}>
      <header className="land-nav">
        <Logo />
        <nav className={menu ? "open" : ""}>
          <a href="#features" onClick={closeMenu}>{t("Features")}</a>
          <a href="#how" onClick={closeMenu}>{t("How it works")}</a>
          <a href="#pricing" onClick={closeMenu}>{t("Pricing")}</a>
          <a href="#about" onClick={closeMenu}>{t("About")}</a>
          <LanguageSelect />
          <button type="button" onClick={() => go("signin")}>{t("Sign in")}</button>
          <Button onClick={() => go("signup")}>{t("Get started")}</Button>
        </nav>
        <div className="mobile-language"><LanguageSelect /></div>
        <button
          type="button"
          className="hamb"
          aria-label={menu ? t("Close menu") : t("Open menu")}
          aria-expanded={menu}
          onClick={() => setMenu((current) => !current)}
        >
          {menu ? <X /> : <Menu />}
        </button>
      </header>

      <main>
        <section className="hero">
          <div>
            <span className="eyebrow"><Sparkles /> {t("Know where your money goes. Plan where it should go.")}</span>
            <h1>{t("Take control of your money without complicated spreadsheets.")}</h1>
            <p>{t("Track income, expenses and budgets in one place, then let BudgetBuddy turn your financial data into simple, useful insights.")}</p>
            <div className="hero-btns">
              <Button size="lg" onClick={() => go("signup")}>{t("Start for free")} <ArrowRight /></Button>
              <Button size="lg" variant="outline" onClick={() => go("dashboard")}><Play /> {t("See how it works")}</Button>
            </div>
            <div className="trust">
              <span><Check />{t("No credit card")}</span>
              <span><Check />{t("Setup in 2 minutes")}</span>
              <span><ShieldCheck />{t("Private by design")}</span>
            </div>
          </div>
          <div className="hero-ui">
            <div className="balance"><span>{t("Total balance")}<small>{t("All accounts")}</small></span><strong>₺82,600</strong></div>
            <div className="hero-chart">
              <ResponsiveContainer>
                <AreaChart data={flow}>
                  <defs><linearGradient id="landing-balance-gradient"><stop stopColor="#5367df" stopOpacity=".3" /><stop offset="1" stopColor="#5367df" stopOpacity="0" /></linearGradient></defs>
                  <Area dataKey="income" stroke="#5367df" strokeWidth={3} fill="url(#landing-balance-gradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mini-stats">
              <span><i className="green"><ArrowUpRight /></i>{t("Income")}<b>₺55,000</b></span>
              <span><i className="coral"><ArrowDownRight /></i>{t("Expenses")}<b>₺30,700</b></span>
              <span><i><PiggyBank /></i>{t("Saved")}<b>44.2%</b></span>
            </div>
            <div className="float-tip"><Sparkles /><span><b>{t("On track, Melisa")}</b><small>{t("You saved ₺24,300 this month.")}</small></span></div>
          </div>
        </section>

        <section id="features" className="section" style={compact ? compactSection : undefined}>
          <header><span className="eyebrow">{t("Everything in one calm place")}</span><h2>{t("Your finances, finally easy to understand.")}</h2><p>{t("Everyday transactions become a clear plan you can act on.")}</p></header>
          <div className="features" style={compact ? compactGrid : undefined}>
            <article className="wide" style={compact ? compactCard : undefined}>
              <ChartNoAxesCombined /><h3>{t("See where your money goes")}</h3><p>{t("Simple cash-flow and category views reveal the patterns that matter.")}</p>
              <div className="bars">{[52, 72, 59, 88, 68, 94].map((height) => <i key={height} style={{ height: `${height}%` }} />)}</div>
            </article>
            <article className="ai-card" style={compact ? compactCard : undefined}>
              <Bot /><h3>{t("Ask in plain language")}</h3><p>{t("Get explanations grounded in your spending—not generic financial advice.")}</p>
              <div>{t("Where am I overspending?")}<span><Sparkles />{t("Dining is 24% higher than last month.")}</span></div>
            </article>
            {featureCards.map(([Icon, heading, copy]) => <article key={heading} style={compact ? compactCard : undefined}><Icon /><h3>{t(heading)}</h3><p>{t(copy)}</p></article>)}
          </div>
        </section>

        <section id="how" className="section how" style={compact ? compactSection : undefined}>
          <header><span className="eyebrow">{t("How it works")}</span><h2>{t("From scattered numbers to a clear next step.")}</h2></header>
          <div style={compact ? compactGrid : undefined}>
            {howSteps.map(([number, heading, copy]) => <article key={number} style={compact ? compactCard : undefined}><b>{number}</b><h3>{t(heading)}</h3><p>{t(copy)}</p></article>)}
          </div>
        </section>

        <Pricing go={go} />

        <section className="section faq">
          <div><span className="eyebrow">{t("Questions, answered")}</span><h2>{t("Know before you start.")}</h2><p>{t("BudgetBuddy helps you understand your own data. It does not provide investment advice.")}</p></div>
          <Accordion type="single" collapsible>
            {faqs.map(([question, answer]) => <AccordionItem value={question} key={question}><AccordionTrigger>{t(question)}</AccordionTrigger><AccordionContent>{t(answer)}</AccordionContent></AccordionItem>)}
          </Accordion>
        </section>

        <section className="cta">
          <div><span className="eyebrow">{t("A calmer money routine starts here")}</span><h2>{t("Make your money make sense.")}</h2></div>
          <Button size="lg" variant="secondary" onClick={() => go("signup")}>{t("Start for free")} <ArrowRight /></Button>
        </section>
      </main>

      <footer id="about"><Logo /><p>{t("Personal finance clarity, without the clutter.")}</p><span>{t("Privacy · Terms · Help")}</span><small>{t("© 2026 BudgetBuddy. Demo experience.")}</small></footer>
    </div>
  );
}

function Pricing({ go }: { go: Navigate }) {
  const t = useT();
  const plans = [
    { name: "Free", price: "₺0", features: ["Manual tracking", "Basic dashboard", "Core categories", "Basic budgets"] },
    { name: "Core", price: "₺149", features: ["Multiple accounts", "Reviewed CSV import", "Goals", "Advanced reports"], featured: true },
    { name: "Pro", price: "₺299", features: ["AI Assistant", "AI insights", "Voice coach UI", "Advanced reports"] },
  ];

  return (
    <section id="pricing" className="section">
      <header><span className="eyebrow">{t("Simple plans")}</span><h2>{t("Start free. Grow when you need to.")}</h2><p>{t("Preview only—no payment system is connected.")}</p></header>
      <div className="prices">
        {plans.map((plan) => <article className={plan.featured ? "hot" : ""} key={plan.name}>
          {plan.featured && <em>{t("Most popular")}</em>}
          <h3>{t(plan.name)}</h3><strong>{plan.price}<small>{t("/month")}</small></strong><p>{t("Clear money management for your next step.")}</p>
          <Button variant={plan.featured ? "default" : "outline"} onClick={() => go("signup")}>{plan.name === "Free" ? t("Start for free") : `${t("Choose")} ${t(plan.name)}`}</Button>
          <ul>{plan.features.map((feature) => <li key={feature}><Check />{t(feature)}</li>)}</ul>
        </article>)}
      </div>
    </section>
  );
}
