// src/pages/student/RequestAppointment.jsx
import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppointments } from "../../context/AppointmentsContext";

export default function RequestAppointment() {
  const { currentUser, users } = useAuth();
  const myRecord = users?.find((u) => u.email === currentUser?.email) || currentUser;
  
  const [form, setForm] = useState({
    date: "",
    timeSlot: "",
    preferredSlots: [],
    isUrgent: false,
    phoneNumber: "",
    reason: ""
  });

  const [submitted, setSubmitted] = useState(false);

  const { createAppointment } = useAppointments?.() || {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!createAppointment) {
      alert("Appointment system not initialized.");
      return;
    }
    if (!form.date || !(form.preferredSlots && form.preferredSlots.length) || !form.reason || !form.phoneNumber) {
      alert("Please complete all required fields, including at least one preferred time slot.");
      return;
    }
    setSubmitted(true);
    const res = await createAppointment({ student: myRecord, form });
    if (res?.success) {
      alert("Appointment request submitted successfully!");
      setForm({ date: "", timeSlot: "", isUrgent: false, phoneNumber: "", reason: "" });
    } else {
      alert(res?.message || "Failed to submit appointment.");
    }
    setSubmitted(false);
  };

  const timeSlots = [
    { label: "9:00 - 10:00 AM", value: "9:00-10:00" },
    { label: "10:00 - 11:00 AM", value: "10:00-11:00" },
    { label: "11:00 - 12:00 PM", value: "11:00-12:00" },
    { label: "1:00 - 2:00 PM", value: "1:00-2:00" },
    { label: "2:00 - 3:00 PM", value: "2:00-3:00" },
    { label: "3:00 - 4:00 PM", value: "3:00-4:00" }
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Counseling Appointment Form</h2>

      {/* Print Instructions */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> This form creates two identical slips — one for DSA records and one for your reference. Please fill out all required fields.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Administrative Section */}
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Administrative</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Today</label>
              <input
                type="date"
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                value={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Control Number</label>
              <input
                type="text"
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                value={"Will be generated on submit"}
              />
            </div>
          </div>
        </div>

        {/* Student Details Section */}
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Student Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                value={currentUser?.name || ""}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
              <input
                type="text"
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                value={myRecord?.studentId || "N/A"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">College</label>
              <input
                type="text"
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                value={myRecord?.college || "N/A"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500"
                value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                placeholder="e.g., 09123456789"
              />
            </div>
          </div>
        </div>

        {/* Appointment Logic Section */}
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Appointment Preferences</h3>
          
          {/* Urgent Priority */}
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isUrgent}
                onChange={(e) => setForm({ ...form, isUrgent: e.target.checked })}
                className="w-5 h-5 text-red-600 rounded"
              />
              <span className="font-medium text-red-700">🚨 URGENT - Immediate Attention Required</span>
            </label>
          </div>

          {/* Preferred Date */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Date *</label>
            <input
              type="date"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>

          {/* Time Slots */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Preferred Time Slots (select one or more) *</label>
            
            <div className="space-y-4">
              {/* Morning Sessions */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Morning Sessions</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {timeSlots.slice(0, 3).map((slot) => {
                    const checked = form.preferredSlots.includes(slot.value);
                    return (
                      <label key={slot.value} className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-maroon-50 transition">
                        <input
                          type="checkbox"
                          name="preferredSlots"
                          value={slot.value}
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm({ ...form, preferredSlots: Array.from(new Set([...(form.preferredSlots||[]), slot.value])) });
                            } else {
                              setForm({ ...form, preferredSlots: (form.preferredSlots||[]).filter(v => v !== slot.value) });
                            }
                          }}
                          className="w-4 h-4 text-maroon-600"
                        />
                        <span className="text-sm text-gray-700">{slot.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Afternoon Sessions */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Afternoon Sessions</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {timeSlots.slice(3).map((slot) => {
                    const checked = form.preferredSlots.includes(slot.value);
                    return (
                      <label key={slot.value} className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-maroon-50 transition">
                        <input
                          type="checkbox"
                          name="preferredSlots"
                          value={slot.value}
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm({ ...form, preferredSlots: Array.from(new Set([...(form.preferredSlots||[]), slot.value])) });
                            } else {
                              setForm({ ...form, preferredSlots: (form.preferredSlots||[]).filter(v => v !== slot.value) });
                            }
                          }}
                          className="w-4 h-4 text-maroon-600"
                        />
                        <span className="text-sm text-gray-700">{slot.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reason for Counseling */}
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Reason for Counseling</h3>
          <textarea
            required
            rows="5"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="Please describe your concern or reason for seeking counseling..."
          ></textarea>
        </div>

        {/* Signature Section */}
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Signatures</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-4">Student Signature</p>
              <div className="border-t-2 border-gray-400 pt-2 text-center">
                <p className="text-xs text-gray-600">Sign above the line</p>
              </div>
              <p className="text-xs text-gray-600 mt-2">{currentUser?.name}</p>
              <p className="text-xs text-gray-600">{new Date().toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-4">Authorized Personnel</p>
              <div className="border-t-2 border-gray-400 pt-2 text-center">
                <p className="text-xs text-gray-600">Sign above the line</p>
              </div>
              <p className="text-xs text-gray-600 mt-2">(DSA Personnel)</p>
              <p className="text-xs text-gray-600">(To be filled by DSA)</p>
            </div>
          </div>
        </div>

        {/* Informed Consent */}
        <div className="bg-maroon-50 border border-maroon-200 p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-maroon-900 mb-4">Informed Consent</h3>
          <div className="text-sm text-maroon-800 space-y-3 mb-4">
            <p>
              <strong>Confidentiality:</strong> All information shared during counseling sessions is confidential and protected under RA 10173 (Data Privacy Act of 2012).
            </p>
            <div>
              <strong>Exceptions to Confidentiality:</strong>
              <ul className="list-disc list-inside ml-2 mt-2">
                <li>Consultation within the counseling team for professional care</li>
                <li>Clear and imminent danger of harm to self or others</li>
                <li>Legal requirement to report abuse/neglect of minors</li>
                <li>Court orders</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={submitted}
            className="flex-1 bg-maroon-500 text-white py-3 rounded-lg hover:bg-maroon-600 font-medium transition disabled:opacity-50"
          >
            {submitted ? "Submitting..." : "Submit Appointment Request"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 font-medium transition"
          >
            Print Form
          </button>
        </div>
      </form>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .p-6 {
            padding: 0;
          }
          button {
            display: none !important;
          }
          .bg-blue-50 {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}