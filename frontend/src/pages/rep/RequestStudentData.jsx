import React, { useState } from "react";

export default function RequestStudentData() {
  const [form, setForm] = useState({
    studentName: "",
    studentId: "",
    reason: ""
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Request submitted to DSA Administrator for approval.");
    setSubmitted(true);
    setForm({ studentName: "", studentId: "", reason: "" });
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Request Student Counseling Data</h2>

      {submitted && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">✓ Request submitted successfully to DSA Administrator</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 p-6 rounded-xl shadow max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Student Name</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500"
              value={form.studentName}
              onChange={(e) => setForm({ ...form, studentName: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Student ID</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500"
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Request</label>
            <textarea
              required
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Explain why you need access to this student's data..."
            ></textarea>
          </div>

          <button
            type="submit"
            className="w-full bg-maroon-500 text-white py-3 rounded-lg hover:bg-maroon-600 font-medium transition"
          >
            Submit Request
          </button>
        </form>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Note:</h3>
        <p className="text-sm text-blue-800">Your request will be reviewed by the DSA Administrator. You will receive a notification once approved or denied.</p>
      </div>
    </div>
  );
}