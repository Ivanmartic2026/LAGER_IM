import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from "@/api/base44Client";
import MyTasksDashboard from "@/components/dashboard/MyTasksDashboard";
import PODashboard from "@/components/dashboard/PODashboard";
import RecentActivityWidget from "@/components/activity/RecentActivityWidget";

export default function HomePage() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setUserEmail(u?.email)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <RecentActivityWidget />
        <MyTasksDashboard userEmail={userEmail} />
        <PODashboard />
      </div>
    </div>
  );
}