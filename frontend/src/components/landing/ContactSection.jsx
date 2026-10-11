// src/components/landing/ContactSection.jsx
import React from "react";
import Reveal from "./Reveal";
import { motion } from "framer-motion";
import { Mail, Phone, Clock, MapPin, Building2, Facebook } from "lucide-react";

const GMAIL_COMPOSE_URL =
  "https://mail.google.com/mail/?view=cm&fs=1&to=msudsa70@gmail.com&su=Inquiry%20via%20CounceLink";

const CONTACT_CARDS = [
  { icon: Mail, label: "Email", value: "msudsa70@gmail.com", href: GMAIL_COMPOSE_URL, external: true, color: "bg-blue-500/10 text-blue-600 dark:text-blue-300" },
  { icon: Facebook, label: "Facebook Page", value: "MSU DSA Guidance and Counseling Section", href: "https://www.facebook.com/profile.php?id=61574715717322", external: true, color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300" },
  { icon: Phone, label: "Contact Number", value: "0948-509-4731", href: "tel:09485094731", external: false, color: "bg-maroon-500/10 text-maroon-500 dark:text-maroon-300" },
  { icon: Clock, label: "Office Hours", value: "Monday – Friday: 9:00 AM – 12:00 PM, 1:00 PM – 5:00 PM", href: null, color: "bg-amber-500/10 text-amber-600 dark:text-amber-300" },
];

export default function ContactSection() {
  return (
    <section id="contact" aria-label="Contact the guidance section" className="py-24 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-2xl bg-maroon-100 dark:bg-maroon-500/15 text-maroon-600 dark:text-maroon-300 text-sm font-bold mb-4 tracking-wide uppercase">Contact Us</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">Get in Touch with the Guidance Section</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-lg leading-relaxed">Have questions or need assistance? Reach out to the Guidance and Counseling Section directly.</p>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <Reveal variant="left">
            <div className="bg-gradient-to-br from-maroon-500 via-maroon-600 to-maroon-800 rounded-2xl p-8 text-white mb-6 shadow-xl border border-white/20 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" aria-hidden="true" />
              <div className="flex items-start gap-4 relative">
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
                  <Building2 size={24} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-0.5">Division of Student Affairs</h3>
                  <p className="text-white/80 text-sm mb-1">Guidance and Counseling Section</p>
                  <div className="flex items-center gap-1.5 text-white/70 text-sm mt-2">
                    <MapPin size={14} className="shrink-0" aria-hidden="true" />
                    <span>Mindanao State University – Marawi City</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {CONTACT_CARDS.map(({ icon: Icon, label, value, href, external, color }) => (
                <motion.div
                  key={label}
                  whileHover={{ x: 4, scale: 1.01 }}
                  className="flex items-center gap-4 p-4 bg-gray-50/80 dark:bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-white/10"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                    <Icon size={18} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{label}</p>
                    {href ? (
                      <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} title={label === "Email" ? "Compose in Gmail to msudsa70@gmail.com" : value} className="text-sm font-semibold text-gray-800 dark:text-gray-100 hover:text-maroon-500 dark:hover:text-maroon-300 transition-colors block truncate">
                        {value}
                      </a>
                    ) : (
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-relaxed">{value}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 mb-8">
              <a href={GMAIL_COMPOSE_URL} target="_blank" rel="noopener noreferrer" title="Compose in Gmail to msudsa70@gmail.com" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-maroon-500 hover:bg-maroon-500 text-white text-sm font-semibold transition-all shadow-glow hover:scale-[1.03]">
                <Mail size={16} aria-hidden="true" /> Email Us via Gmail
              </a>
              <a href="https://www.facebook.com/profile.php?id=61574715717322" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg hover:scale-[1.03]">
                <Facebook size={16} aria-hidden="true" /> Visit DSA Facebook
              </a>
            </div>

            <div className="mt-8 flex items-center gap-5 flex-wrap">
              <img src="/msu-logo.png" alt="MSU Marawi logo" loading="lazy" className="h-14 object-contain" />
              <img src="/dsa-logo.png?v=2" alt="Division of Student Affairs logo" loading="lazy" className="h-14 object-contain" />
              <img src="/guidance-logo.jpg" alt="Guidance Office logo" loading="lazy" className="h-14 object-contain rounded-xl" />
            </div>
          </Reveal>

          <Reveal variant="right" delay={120} className="rounded-2xl overflow-hidden border border-gray-100 dark:border-white/10 shadow-xl bg-gray-50 dark:bg-white/[0.03] backdrop-blur-xl">
            <iframe
              title="MSU Division of Student Affairs — Guidance and Counseling Section map"
              src="https://www.google.com/maps?q=MSU%20Division%20of%20Student%20Affairs%2C%20Mindanao%20State%20University%20Marawi%207.9992142%2C124.258914&z=19&output=embed"
              width="100%"
              height="420"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full"
            />
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-white/10">
              <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                <MapPin size={16} className="text-maroon-500 dark:text-maroon-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <span className="font-semibold text-gray-800 dark:text-white">MSU – Division of Student Affairs</span><br />
                  Mindanao State University, Marawi City
                </span>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap">
                <a href="https://maps.app.goo.gl/Xd7hATD5kfCJyG8x9" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-maroon-500 hover:bg-maroon-500 text-white text-sm font-semibold transition-colors">
                  <MapPin size={14} aria-hidden="true" /> Open in Google Maps
                </a>
                <a href="https://www.google.com/maps/dir/?api=1&destination=MSU+Division+of+Student+Affairs+Marawi+City+7.9992142%2C124.258914" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-800 text-white text-sm font-semibold transition-colors">
                  Get Directions
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
