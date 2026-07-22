'use client';

import { useState } from 'react';
import { EnvelopeSimple, PhoneCall, MapPin, PaperPlaneTilt, CheckCircle, Warning } from '@phosphor-icons/react';

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
      {/* Top Section: How Can We Help You? & Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Contact Information */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-3">
            <span className="inline-block px-3 py-1 rounded-full bg-warm-accent/20 text-warm-fg text-xs font-black uppercase tracking-wider">
              Get In Touch
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-warm-fg tracking-tight">
              How Can We Help You?
            </h1>
            <p className="text-sm text-warm-muted leading-relaxed max-w-lg">
              Have questions about an order, delivery times, or product availability? Reach out to Chittagong&apos;s trusted grocery store since 1947. Our team is here to assist you 7 days a week.
            </p>
          </div>

          {/* Contact Details List */}
          <div className="space-y-5 pt-2">
            {/* Address */}
            <div className="flex items-start gap-4 p-4 rounded-[20px] bg-warm-surface border border-warm-border/60 shadow-warm-sm hover:shadow-warm-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-warm-accent/20 border border-warm-accent/40 flex items-center justify-center text-warm-fg shrink-0">
                <MapPin weight="fill" size={24} className="text-warm-fg" aria-hidden="true" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-extrabold text-warm-fg">Address</h3>
                <p className="text-xs text-warm-muted leading-relaxed font-semibold">
                  665 Percival Hill Road, Emdad Park Chittagong, Bangladesh
                </p>
                <a
                  href="https://maps.app.goo.gl/tfiRABoc1WsKEt619"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-warm-fg hover:text-warm-muted transition-colors underline underline-offset-2 mt-1"
                >
                  View on Google Maps ↗
                </a>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-4 p-4 rounded-[20px] bg-warm-surface border border-warm-border/60 shadow-warm-sm hover:shadow-warm-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-warm-accent/20 border border-warm-accent/40 flex items-center justify-center text-warm-fg shrink-0">
                <PhoneCall weight="fill" size={24} className="text-warm-fg" aria-hidden="true" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-extrabold text-warm-fg">Phone Hotline</h3>
                <a href="tel:+8801731944544" className="text-xs text-warm-muted font-semibold hover:text-warm-fg transition-colors block">
                  +8801731944544 <span className="text-warm-fg font-bold">(Main Hotline)</span>
                </a>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-4 p-4 rounded-[20px] bg-warm-surface border border-warm-border/60 shadow-warm-sm hover:shadow-warm-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-warm-accent/20 border border-warm-accent/40 flex items-center justify-center text-warm-fg shrink-0">
                <EnvelopeSimple weight="fill" size={24} className="text-warm-fg" aria-hidden="true" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-extrabold text-warm-fg">E-mail Us</h3>
                <a href="mailto:hello@luckystore1947.com" className="text-xs text-warm-muted font-semibold hover:text-warm-fg transition-colors block">
                  hello@luckystore1947.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Google Maps Embed Card */}
        <div className="lg:col-span-6 h-full min-h-[380px] sm:min-h-[440px] rounded-[28px] overflow-hidden border border-warm-border/80 shadow-warm-md relative bg-warm-surface group">
          <iframe
            title="Lucky Store Chittagong Location"
            src="https://maps.google.com/maps?q=665+Percival+Hill+Road,+Emdad+Park,+Chittagong,+Bangladesh&t=&z=16&ie=UTF8&iwloc=B&output=embed"
            width="100%"
            height="100%"
            style={{ border: 0, minHeight: '380px' }}
            allowFullScreen={false}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-full rounded-[28px]"
          />
          <a
            href="https://maps.app.goo.gl/tfiRABoc1WsKEt619"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-5 right-5 bg-warm-fg text-warm-accent px-4 py-2.5 rounded-full text-xs font-extrabold shadow-xl hover:bg-warm-fg-strong hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 z-10 border border-warm-accent/40"
          >
            <span>Open in Google Maps</span>
            <span>↗</span>
          </a>
        </div>
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
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs font-bold flex items-center gap-2">
            <CheckCircle weight="fill" size={18} className="shrink-0 text-emerald-600" />
            <span>Thank you! Your message has been received. We will get back to you shortly.</span>
          </div>
        )}

        {/* Error Alert */}
        {status === 'error' && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-bold flex items-center gap-2">
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
    </div>
  );
}
