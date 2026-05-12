import React from "react";
import { Navigate } from "react-router-dom";

// Landing redirects to MarketingHome (root path)
export default function Landing() {
  return <Navigate to="/" replace />;
}
