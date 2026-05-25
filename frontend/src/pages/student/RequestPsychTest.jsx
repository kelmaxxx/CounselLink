import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTests } from "../../context/TestsContext";

const timeSlots = [
  { value: "9:00-10:00", label: "9:00 - 10:00 AM" },
  { value: "10:00-11:00", label: "10:00 - 11:00 AM" },
  { value: "11:00-12:00", label: "11:00 - 12:00 PM" },
  { value: "1:00-2:00", label: "1:00 - 2:00 PM" },
  { value: "2:00-3:00", label: "2:00 - 3:00 PM" },
  { value: "3:00-4:00", label: "3:00 - 4:00 PM" },
];

export default function RequestPsychTest() {
  const { currentUser, users } = useAuth();
  const { createTestRequest } = useTests();
  const myRecord = users?.find((u) => u.email === currentUser?.email) || currentUser;

  const [form, setForm] = useState({
    testType: "Psychological Test",
    date: "",
    preferredSlots: [],
    phoneNumber: "",
    reason: "",
  });

  const toggleSlot = (val, checked) => {
    setForm((f) => {
      const set = new Set(f.preferredSlots || []);
      if (checked) set.add(val); else set.delete(val);
      return { ...f, preferredSlots: Array.from(set) };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date || !(form.preferredSlots && form.preferredSlots.length) || !form.phoneNumber) {
      alert("Please provide date, at least one preferred time, and phone number.");
      return;
    }
    const res = await createTestRequest({ student: myRecord, form });
    if (res.success) {
      alert("Psychological test request submitted.");
      setForm({ testType: "Psychological Test", date: "", preferredSlots: [], phoneNumber: "", reason: "" });
    } else {
      alert(res.message || "Failed to submit test request");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Request Psychological Test</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Test Type</label>
              <select className="w-full border rounded px-3 py-2" value={form.testType} onChange={(e) => setForm({ ...form, testType: e.target.value })}>
                <option>Psychological Test</option>
                <option>Personality Test</option>
                <option>Career Assessment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
              <input type="date" className="w-full border rounded px-3 py-2" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input className="w-full border rounded px-3 py-2" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
              <textarea rows={3} className="w-full border rounded px-3 py-2" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Preferred Time Slots</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {timeSlots.map((slot) => (
              <label key={slot.value} className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-maroon-50 transition">
                <input type="checkbox" checked={form.preferredSlots.includes(slot.value)} onChange={(e) => toggleSlot(slot.value, e.target.checked)} />
                <span className="text-sm text-gray-700">{slot.label}</span>
              </label>
            ))}
          </div>
        </div>

        <button type="submit" className="px-4 py-2 bg-maroon-600 text-white rounded">Submit Request</button>
      </form>
    </div>
  );
}
