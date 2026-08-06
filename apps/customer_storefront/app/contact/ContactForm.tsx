'use client';

import { useState } from 'react';
import { PaperPlaneTilt, CheckCircle, Warning } from '@phosphor-icons/react';
import { GoogleMapEmbed } from './GoogleMapEmbed';

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    topic: '',
    message: '',
  });

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      setStatus('error');
      setErrorMessage('Please fill in all required fields (Name, Email, and Message).');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      // Simulate form submission delay or call API endpoint
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStatus('success');
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        topic: '',
        message: '',
      });
    } catch {
      setStatus('error');
      setErrorMessage('Failed to send message. Please try again or reach out on WhatsApp.');
    }
  };

  return (
    <div className="space-y-12 max-w-7xl mx-auto">
      {/* Full Viewport Embedded Map */}
      <div className="w-full h-[450px] sm:h-[280px] md:h-[320px] lg:h-[550px] rounded-[28px] overflow-hidden border border-warm-border/80 shadow-warm-md relative bg-warm-surface group">
        <GoogleMapEmbed placeId="ChIJH4nhmJAnrTARgEupScnGdJI" />
        <a
          href="https://maps.app.goo.gl/Yd3mAphotMJiVPM97"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-4 right-4 sm:bottom-5 sm:right-5 bg-warm-fg text-warm-accent px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full text-xs font-extrabold shadow-xl hover:bg-warm-fg-strong hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 z-10 border border-warm-accent/40"
        >
          <span>Open in Google Maps</span>
          <span>↗</span>
        </a>
      </div>

      {/* Form Section: Fill Up The Form If You Have Any Question */}
      <div className="bg-warm-surface border border-warm-border/80 rounded-[28px] p-6 sm:p-10 shadow-warm-sm space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-warm-fg tracking-tight">
            Fill Up The Form If You Have Any Question
          </h2>
          <p className="text-xs sm:text-sm text-warm-muted mt-1">
            Send us a message directly and our customer service team will respond within 2 hours.
          </p>
        </div>

        {/* Success Alert */}
        {status === 'success' && (
          <div
            role="alert"
            aria-live="polite"
            className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs font-bold flex items-center gap-2"
          >
            <CheckCircle weight="fill" size={18} className="shrink-0 text-emerald-600" />
            <span>Thank you! Your message has been received. We will get back to you shortly.</span>
          </div>
        )}

        {/* Error Alert */}
        {status === 'error' && (
          <div
            role="alert"
            aria-live="polite"
            className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-bold flex items-center gap-2"
          >
            <Warning weight="fill" size={18} className="shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Name */}
            <div className="space-y-1">
              <label htmlFor="name" className="text-xs font-bold text-warm-fg">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your full name"
                className="w-full h-11 px-4 rounded-2xl bg-warm-bg border border-warm-border/80 focus:border-warm-accent focus:bg-white outline-none text-xs font-semibold transition-all"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label htmlFor="email" className="text-xs font-bold text-warm-fg">
                E-mail <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your.email@example.com"
                className="w-full h-11 px-4 rounded-2xl bg-warm-bg border border-warm-border/80 focus:border-warm-accent focus:bg-white outline-none text-xs font-semibold transition-all"
                required
              />
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label htmlFor="phone" className="text-xs font-bold text-warm-fg">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+880 1700-000000"
                className="w-full h-11 px-4 rounded-2xl bg-warm-bg border border-warm-border/80 focus:border-warm-accent focus:bg-white outline-none text-xs font-semibold transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Subject */}
            <div className="space-y-1">
              <label htmlFor="subject" className="text-xs font-bold text-warm-fg">
                Subject
              </label>
              <input
                id="subject"
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Order status, product inquiry..."
                className="w-full h-11 px-4 rounded-2xl bg-warm-bg border border-warm-border/80 focus:border-warm-accent focus:bg-white outline-none text-xs font-semibold transition-all"
              />
            </div>

            {/* Topic Select */}
            <div className="space-y-1">
              <label htmlFor="topic" className="text-xs font-bold text-warm-fg">
                Select Topic
              </label>
              <select
                id="topic"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="w-full h-11 px-4 rounded-2xl bg-warm-bg border border-warm-border/80 focus:border-warm-accent focus:bg-white outline-none text-xs font-semibold transition-all cursor-pointer"
              >
                <option value="">- Select -</option>
                <option value="order_status">Order Status &amp; Tracking</option>
                <option value="delivery">Same-Day Delivery Inquiry</option>
                <option value="product_request">Product Request &amp; Stock</option>
                <option value="wholesale">Wholesale / Bulk Orders</option>
                <option value="general">General Support</option>
              </select>
            </div>
          </div>

          {/* Message Textarea */}
          <div className="space-y-1">
            <label htmlFor="message" className="text-xs font-bold text-warm-fg">
              Your Message <span className="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              rows={5}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Write your query or message here..."
              className="w-full p-4 rounded-2xl bg-warm-bg border border-warm-border/80 focus:border-warm-accent focus:bg-white outline-none text-xs font-semibold transition-all resize-y"
              required
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-warm-fg text-warm-accent text-xs font-black uppercase tracking-wider hover:bg-warm-fg-strong active:scale-95 transition-all shadow-warm-sm disabled:opacity-50 cursor-pointer"
            >
              <PaperPlaneTilt weight="bold" size={16} />
              <span>{status === 'submitting' ? 'Sending Message...' : 'Send Us Message'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* FAQ Section */}
      <div id="faq" className="scroll-mt-24 bg-warm-surface border border-warm-border/80 rounded-[28px] p-6 sm:p-10 shadow-warm-sm space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-warm-fg tracking-tight">
            Frequently Asked Questions (FAQ)
          </h2>
          <p className="text-xs sm:text-sm text-warm-muted mt-1">
            Quick answers to common questions about grocery delivery, payments, and returns.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-warm-bg/60 border border-warm-border/50 space-y-1">
            <h3 className="text-sm font-bold text-warm-fg">Does Lucky Store offer home delivery for online grocery in Chittagong?</h3>
            <p className="text-xs text-warm-muted leading-relaxed">Yes! We deliver fresh groceries, oil, rice, and daily bazaar items across Chittagong city directly to your doorstep.</p>
          </div>

          <div className="p-4 rounded-2xl bg-warm-bg/60 border border-warm-border/50 space-y-1">
            <h3 className="text-sm font-bold text-warm-fg">Can I pay when my grocery order arrives?</h3>
            <p className="text-xs text-warm-muted leading-relaxed">Yes, Cash on Delivery (COD) is available for all Chittagong city orders.</p>
          </div>

          <div className="p-4 rounded-2xl bg-warm-bg/60 border border-warm-border/50 space-y-1">
            <h3 className="text-sm font-bold text-warm-fg">What if an item in my order is damaged or missing?</h3>
            <p className="text-xs text-warm-muted leading-relaxed">We offer free instant returns and replacement upon delivery if any product is missing or damaged.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
