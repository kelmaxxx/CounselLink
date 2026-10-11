// src/components/landing/ContactSection.jsx
import React from "react";
import Reveal from "./Reveal";
import { Mail, Phone, Clock, MapPin, Building2, Facebook } from "lucide-react";

const GMAIL_COMPOSE_URL =
  "https://mail.google.com/mail/?view=cm&fs=1&to=msudsa70@gmail.com&su=Inquiry%20via%20CounceLink";

const CONTACT_CARDS = [
  {
    icon: Mail,
    label: "Email",
    value: "msudsa70@gmail.com",
    href: GMAIL_COMPOSE_URL,
    external: true,
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Facebook,
    label: "Facebook Page",
    value: "MSU DSA Guidance and Counseling Section",
    href: "https://www.facebook.com/profile.php?id=61574715717322",
    external: true,
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: Phone,
    label: "Contact Number",
    value: "0948-509-4731",
    href: "tel:09485094731",
    external: false,
    color: "bg-maroon-50 text-maroon-600",
  },
  {
    icon: Clock,
    label: "Office Hours",
    value: "Monday – Friday: 9:00 AM – 12:00 PM, 1:00 PM – 5:00 PM",
    href: null,
    color: "bg-amber-50 text-amber-600",
  },
];

export default function ContactSection() {
  return (
    <section id="contact" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <Reveal className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-maroon-100 text-maroon-600 text-sm font-semibold mb-4 tracking-wide uppercase">
            Contact Us
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Get in Touch with the Guidance Section
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-lg">
            Have questions or need assistance? Reach out to the Guidance and
            Counseling Section directly.
          </p>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left — office info */}
          <Reveal variant="left">
            {/* Office header card */}
            <div className="bg-gradient-to-br from-maroon-500 to-maroon-700 rounded-3xl p-8 text-white mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-0.5">
                    Division of Student Affairs
                  </h3>
                  <p className="text-white/80 text-sm mb-1">
                    Guidance and Counseling Section
                  </p>
                  <div className="flex items-center gap-1.5 text-white/70 text-sm mt-2">
                    <MapPin size={14} className="shrink-0" />
                    <span>Mindanao State University – Marawi City</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact cards */}
            <div className="space-y-4 mb-6">
              {CONTACT_CARDS.map(({ icon: Icon, label, value, href, external, color }) => (
                <div
                  key={label}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">
                      {label}
                    </p>
                    {href ? (
                      <a
                        href={href}
                        {...(external
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        title={label === "Email" ? "Compose in Gmail to msudsa70@gmail.com" : value}
                        className="text-sm font-semibold text-gray-800 hover:text-maroon-600 transition-colors block truncate"
                      >
                        {value}
                      </a>
                    ) : (
                      <p className="text-sm font-semibold text-gray-800 leading-relaxed">{value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Contact Buttons */}
            <div className="flex flex-wrap gap-3 mb-8">
              <a
                href={GMAIL_COMPOSE_URL}
                target="_blank"
                rel="noopener noreferrer"
                title="Compose in Gmail to msudsa70@gmail.com"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-maroon-500 hover:bg-maroon-600 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                <Mail size={16} />
                Email Us via Gmail
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61574715717322"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                <Facebook size={16} />
                Visit DSA Facebook
              </a>
            </div>

            {/* Logos */}
            <div className="mt-8 flex items-center gap-5 flex-wrap">
              <img src="/msu-logo.png" alt="MSU Marawi" className="h-14 object-contain" />
              <img src="/dsa-logo.png?v=2" alt="Division of Student Affairs" className="h-14 object-contain" />
              <img src="/guidance-logo.jpg" alt="Guidance Office" className="h-14 object-contain rounded-lg" />
            </div>
          </Reveal>

          {/* Right — Google Map */}
          <Reveal variant="right" delay={120} className="rounded-3xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50">
            <iframe
              title="MSU Division of Student Affairs — Guidance and Counseling Section"
              src="https://www.google.com/maps?q=MSU%20Division%20of%20Student%20Affairs%2C%20Mindanao%20State%20University%20Marawi%207.9992142%2C124.258914&z=19&output=embed"
              width="100%"
              height="420"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full"
            />
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between p-4 bg-white border-t border-gray-100">
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin size={16} className="text-maroon-600 shrink-0 mt-0.5" />
                <span>
                  <span className="font-semibold text-gray-800">
                    MSU – Division of Student Affairs
                  </span>
                  <br />
                  Mindanao State University, Marawi City
                </span>
              </div>
              <div className="flex gap-2 shrink-0">
                <a
                  href="https://maps.app.goo.gl/Xd7hATD5kfCJyG8x9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-maroon-500 hover:bg-maroon-600 text-white text-sm font-semibold transition-colors"
                >
                  <MapPin size={14} />
                  Open in Google Maps
                </a>
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=MSU+Division+of+Student+Affairs+Marawi+City+7.9992142%2C124.258914"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold transition-colors"
                >
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
