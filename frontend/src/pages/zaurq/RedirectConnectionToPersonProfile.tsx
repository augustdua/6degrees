import React from "react";
import { Navigate, useParams } from "react-router-dom";

export default function RedirectConnectionToPersonProfile() {
  const { connectionId } = useParams<{ connectionId: string }>();
  if (!connectionId) return <Navigate to="/network" replace />;
  return <Navigate to={`/network/${connectionId}`} replace />;
}


