import { useLocalSearchParams } from "expo-router";
import React from "react";

import EmailDetailPanel from "@/components/EmailDetailPanel";
import { SwipeBackView } from "@/components/SwipeBackView";

export default function EmailDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) return null;

  return (
    <SwipeBackView>
      {(goBack) => <EmailDetailPanel emailId={id} onClose={goBack} />}
    </SwipeBackView>
  );
}
