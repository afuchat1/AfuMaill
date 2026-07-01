import { router, useLocalSearchParams } from "expo-router";
import React from "react";

import EmailDetailPanel from "@/components/EmailDetailPanel";

export default function EmailDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  function goBack() {
    router.back();
  }

  if (!id) return null;

  return <EmailDetailPanel emailId={id} onClose={goBack} />;
}
