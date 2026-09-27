import Link from 'next/link';
import {
  CheckCircle,
  CreditCard,
  Storefront,
  Truck,
} from '@phosphor-icons/react/dist/ssr';
import { withLocale, type Locale } from '../lib/i18n/config';
import { getDictionary } from '../lib/i18n/dictionaries';

const proofIcons = [Storefront, Truck, CheckCircle] as const;
const faqIcons = [Truck, CreditCard, CheckCircle] as const;

export function HomeConfidence({ locale = 'en' }: { locale?: Locale }) {
  const dict = getDictionary(locale).confidence;

  return (
    <section
      aria-labelledby="home-confidence-title"
      className="space-y-5 border-y border-warm-border py-6 sm:py-8"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-warm-muted">
            {dict.kicker}
          </p>
          <h2
            id="home-confidence-title"
            className="mt-1 text-balance text-xl font-black leading-tight tracking-tight text-warm-fg sm:text-2xl"
          >
            {dict.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-warm-muted sm:text-base">
            {dict.subtitle}
          </p>
        </div>
        <Link
          href={withLocale('/delivery', locale)}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-warm-border bg-warm-surface px-4 text-sm font-extrabold text-warm-fg transition-colors hover:border-warm-accent hover:bg-warm-accent hover:text-warm-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
        >
          {dict.deliveryCta}
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {dict.proofs.map((proof, index) => {
          const Icon = proofIcons[index] ?? CheckCircle;

          return (
            <article
              key={proof.title}
              className="rounded-warm-card border border-warm-border bg-warm-surface p-4"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warm-accent-ghost text-warm-fg">
                  <Icon size={20} weight="bold" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-warm-fg sm:text-base">
                    {proof.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-warm-muted">
                    {proof.body}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="divide-y divide-warm-border overflow-hidden rounded-warm-panel border border-warm-border bg-warm-surface">
        {dict.faqs.map((faq, index) => {
          const Icon = faqIcons[index] ?? CheckCircle;

          return (
            <details key={faq.question} className="group">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4 text-left font-black text-warm-fg transition-colors hover:bg-warm-image-well/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warm-image-well text-warm-fg">
                  <Icon size={18} weight="bold" aria-hidden="true" />
                </span>
                <span className="flex-1 text-sm sm:text-base">{faq.question}</span>
                <span className="text-lg leading-none text-warm-muted transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <div className="px-4 pb-5 pl-16 text-sm leading-6 text-warm-muted sm:text-base">
                <p>{faq.answer}</p>
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
